from pathlib import Path
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.paper import Paper
from app.models.paper_chunk import PaperChunk
from app.services.pdf_service import extract_pdf_text
from app.services.chunk_service import create_chunks


def process_paper(
    db: Session,
    paper_id: UUID,
    pdf_path: Path,
) -> int:
    """
    Extract text from a PDF, create chunks,
    and save the chunks to PostgreSQL.
    """

    pages = extract_pdf_text(pdf_path)

    chunks = create_chunks(pages)

    for chunk in chunks:
        paper_chunk = PaperChunk(
            paper_id=paper_id,
            chunk_index=chunk["chunk_index"],
            page_number=chunk["page_number"],
            section=None,
            content=chunk["content"],
        )

        db.add(paper_chunk)

    db.commit()

    return len(chunks)