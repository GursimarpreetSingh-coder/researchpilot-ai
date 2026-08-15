from pathlib import Path

from app.db.session import SessionLocal
from app.models.paper import Paper
from app.services.paper_processor import process_paper


PDF_PATH = Path(
    "storage/papers/df569f8b-c6b4-4c8b-bbec-697204de4b27.pdf"
)


db = SessionLocal()

try:
    paper = Paper(
        title="Test Research Paper",
        pdf_path=str(PDF_PATH),
        source="upload",
    )

    db.add(paper)
    db.commit()
    db.refresh(paper)

    print(f"Created paper: {paper.id}")

    chunk_count = process_paper(
        db=db,
        paper_id=paper.id,
        pdf_path=PDF_PATH,
    )

    print(f"Created chunks: {chunk_count}")

finally:
    db.close()