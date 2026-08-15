import json
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.paper_chunk import PaperChunk
from app.models.paper_summary import PaperSummary
from app.services.ai_service import client, MODEL


def generate_paper_summary(
    db: Session,
    paper_id: UUID,
) -> PaperSummary:
    """
    Generate an AI summary for a paper using its stored chunks
    and save the result to PostgreSQL.
    """

    # Get all chunks in the correct order.
    chunks = db.scalars(
        select(PaperChunk)
        .where(PaperChunk.paper_id == paper_id)
        .order_by(PaperChunk.chunk_index)
    ).all()

    if not chunks:
        raise ValueError("No paper chunks found for this paper.")

    paper_text = "\n\n".join(
        chunk.content
        for chunk in chunks
    )

    prompt = f"""
You are ResearchPilot, an AI research-paper analysis assistant.

Analyze the research paper below.

Return ONLY valid JSON with exactly these four keys:

{{
  "summary": "...",
  "key_contributions": "...",
  "methodology": "...",
  "limitations": "..."
}}

Requirements:

- summary: Give a clear research-level overview of the paper.
- key_contributions: Explain the main contributions or important findings.
- methodology: Explain how the research was conducted.
- limitations: Identify limitations explicitly stated or strongly supported
  by the paper.
- Do NOT invent information.
- If something is not stated or cannot be determined from the paper,
  write "Not clearly stated in the provided paper."
- Preserve important technical terminology.
- Base the response ONLY on the supplied paper text.

PAPER:
==================================================
{paper_text}
==================================================
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
    )

    raw_text = response.text.strip()

    # Remove markdown code fences if Gemini returns them.
    if raw_text.startswith("```"):
        raw_text = raw_text.replace("```json", "", 1)
        raw_text = raw_text.replace("```", "", 1)
        raw_text = raw_text.strip()

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Gemini returned invalid JSON:\n{raw_text}"
        ) from exc

    summary = PaperSummary(
        paper_id=paper_id,
        summary=data.get("summary", ""),
        key_contributions=data.get("key_contributions"),
        methodology=data.get("methodology"),
        limitations=data.get("limitations"),
    )

    db.add(summary)
    db.commit()
    db.refresh(summary)

    return summary