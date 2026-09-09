from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.paper import Paper
from app.models.paper_chunk import PaperChunk
from app.services.ai_service import generate_embedding, generate_answer


PAPER_RELEVANCE_THRESHOLD = 0.38


def retrieve_relevant_chunks(
    db: Session,
    query: str,
    top_k: int = 5,
    paper_id: UUID | None = None,
    paper_ids: list[UUID] | None = None,
) -> list[PaperChunk]:
    """
    Retrieve the most relevant chunks from a paper.
    """

    selected_paper_ids = paper_ids or ([paper_id] if paper_id else [])
    if not selected_paper_ids:
        return []

    query_embedding = generate_embedding(query)

    chunks = db.scalars(
        select(PaperChunk)
        .where(
            PaperChunk.paper_id.in_(selected_paper_ids),
            PaperChunk.embedding.is_not(None),
        )
        .order_by(PaperChunk.chunk_index)
    ).all()

    if not chunks:
        return []

    # Temporary in-Python cosine similarity.
    # We will move this to PostgreSQL/pgvector later.
    def cosine_similarity(a, b):
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(y * y for y in b) ** 0.5

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot / (norm_a * norm_b)

    scored_chunks = []

    for chunk in chunks:
        embedding = chunk.embedding

        if isinstance(embedding, str):
            import json
            embedding = json.loads(embedding)

        score = cosine_similarity(query_embedding, embedding)

        scored_chunks.append((score, chunk))

    scored_chunks.sort(
        key=lambda item: item[0],
        reverse=True,
    )

    return [
        chunk
        for score, chunk in scored_chunks[:top_k]
    ]


def answer_question(
    db: Session,
    question: str,
    top_k: int = 5,
    paper_id: UUID | None = None,
    paper_ids: list[UUID] | None = None,
) -> dict:
    """
    Answer a question using retrieved paper chunks.
    """

    chunks = retrieve_relevant_chunks(
        db=db,
        paper_id=paper_id,
        paper_ids=paper_ids,
        query=question,
        top_k=top_k,
    )

    if not chunks:
        return {
            "answer": generate_answer(
                f"""
You are ResearchPilot, a helpful AI research assistant.

The user asked a question that cannot be answered from the selected paper.
Answer it using your general knowledge. Be accurate, concise, and clear.
Do not pretend the answer came from the paper and do not add paper citations.

USER QUESTION:
{question}
"""
            ),
            "sources": [],
        }

    def cosine_similarity(a, b):
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(y * y for y in b) ** 0.5

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot / (norm_a * norm_b)

    query_embedding = generate_embedding(question)
    top_relevance = 0.0

    for chunk in chunks:
        embedding = chunk.embedding

        if isinstance(embedding, str):
            import json
            embedding = json.loads(embedding)

        top_relevance = max(
            top_relevance,
            cosine_similarity(query_embedding, embedding),
        )

    if top_relevance < PAPER_RELEVANCE_THRESHOLD:
        return {
            "answer": generate_answer(
                f"""
You are ResearchPilot, a helpful AI research assistant.

The user's question is outside the scope of the selected paper.
Answer it using your general knowledge. Be accurate, useful, and concise.
Mention briefly that this answer is general knowledge and not taken from the
selected paper. Do not invent paper evidence or page citations.

USER QUESTION:
{question}
"""
            ),
            "sources": [],
        }

    context_parts = []

    for chunk in chunks:
        paper = db.get(Paper, chunk.paper_id)
        paper_label = paper.title if paper else str(chunk.paper_id)
        context_parts.append(
            f"""
    [Paper: {paper_label}]
    [Page {chunk.page_number}, Chunk {chunk.chunk_index}]

{chunk.content}
"""
        )

    context = "\n".join(context_parts)

    prompt = f"""
You are ResearchPilot, an AI research-paper assistant.

Answer the user's question using the provided paper excerpts when the
question is about the selected paper. If the question is outside the paper,
answer it from your general knowledge instead.

USER QUESTION:
{question}

PAPER EXCERPTS:
{context}

RULES:
- For paper-related questions, use only the excerpts and mention page numbers.
- For general questions, answer helpfully from general knowledge.
- Never present general knowledge as if it came from this paper.
- Do not invent paper evidence or citations.
- Give a precise, useful answer.
"""

    answer = generate_answer(prompt)

    sources = [
        {
            "paper_id": str(chunk.paper_id),
            "paper_title": db.get(Paper, chunk.paper_id).title
            if db.get(Paper, chunk.paper_id)
            else "Unknown paper",
            "chunk_index": chunk.chunk_index,
            "page_number": chunk.page_number,
        }
        for chunk in chunks
    ]

    return {
        "answer": answer,
        "sources": sources,
    }