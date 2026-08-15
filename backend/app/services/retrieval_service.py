import math
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.paper_chunk import PaperChunk
from app.services.ai_service import generate_embedding


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0

    dot_product = sum(x * y for x, y in zip(a, b))

    magnitude_a = math.sqrt(sum(x * x for x in a))
    magnitude_b = math.sqrt(sum(y * y for y in b))

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return dot_product / (magnitude_a * magnitude_b)


def retrieve_relevant_chunks(
    db: Session,
    paper_id: UUID,
    query: str,
    top_k: int = 5,
) -> list[dict]:
    """
    Retrieve the most relevant chunks from a paper
    using cosine similarity between embeddings.
    """

    query_embedding = generate_embedding(query)

    chunks = db.scalars(
        select(PaperChunk)
        .where(PaperChunk.paper_id == paper_id)
        .order_by(PaperChunk.chunk_index)
    ).all()

    scored_chunks = []

    for chunk in chunks:
        if not chunk.embedding:
            continue

        embedding = chunk.embedding

        if isinstance(embedding, str):
            import json
            embedding = json.loads(embedding)

        score = cosine_similarity(
            query_embedding,
            embedding,
        )

        scored_chunks.append(
            {
                "chunk_id": str(chunk.id),
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "section": chunk.section,
                "content": chunk.content,
                "similarity": score,
            }
        )

    scored_chunks.sort(
        key=lambda x: x["similarity"],
        reverse=True,
    )

    return scored_chunks[:top_k]