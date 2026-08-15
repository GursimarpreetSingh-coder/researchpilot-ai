from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.paper import Paper
from app.models.paper_chunk import PaperChunk
from app.services.embedding_service import generate_document_embedding


def embed_paper_chunks(
    db: Session,
    paper_id: UUID,
) -> int:

    chunks = db.scalars(
        select(PaperChunk)
        .where(PaperChunk.paper_id == paper_id)
        .order_by(PaperChunk.chunk_index)
    ).all()

    count = 0

    for chunk in chunks:

        if chunk.embedding is not None:
            continue

        print(f"Embedding chunk {chunk.chunk_index}...")

        chunk.embedding = generate_document_embedding(
            chunk.content
        )

        count += 1

        # Save periodically
        if count % 10 == 0:
            db.commit()

    db.commit()

    return count
