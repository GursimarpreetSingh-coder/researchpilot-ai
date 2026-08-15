from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.paper_chunk import PaperChunk
from app.services.ai_service import generate_embedding, generate_answer


def retrieve_relevant_chunks(
    db: Session,
    paper_id: UUID,
    query: str,
    top_k: int = 5,
) -> list[PaperChunk]:
    """
    Retrieve the most relevant chunks from a paper.
    """

    query_embedding = generate_embedding(query)

    chunks = db.scalars(
        select(PaperChunk)
        .where(
            PaperChunk.paper_id == paper_id,
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
    paper_id: UUID,
    question: str,
    top_k: int = 5,
) -> dict:
    """
    Answer a question using retrieved paper chunks.
    """

    chunks = retrieve_relevant_chunks(
        db=db,
        paper_id=paper_id,
        query=question,
        top_k=top_k,
    )

    if not chunks:
        return {
            "answer": "No relevant information was found in the paper.",
            "sources": [],
        }

    context_parts = []

    for chunk in chunks:
        context_parts.append(
            f"""
[Page {chunk.page_number}, Chunk {chunk.chunk_index}]

{chunk.content}
"""
        )

    context = "\n".join(context_parts)

    prompt = f"""
You are ResearchPilot, an AI research-paper assistant.

Answer the user's question using ONLY the provided paper excerpts.

USER QUESTION:
{question}

PAPER EXCERPTS:
{context}

RULES:
- Use only information from the provided excerpts.
- Do not invent facts.
- If the excerpts do not contain enough information, clearly say so.
- Give a precise, useful answer.
- Mention relevant page numbers when possible.
"""

    answer = generate_answer(prompt)

    sources = [
        {
            "chunk_index": chunk.chunk_index,
            "page_number": chunk.page_number,
        }
        for chunk in chunks
    ]

    return {
        "answer": answer,
        "sources": sources,
    }