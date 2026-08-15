from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.db.session import SessionLocal
from app.models.paper import Paper
from app.services.embedding_processor import embed_paper_chunks
from app.services.paper_processor import process_paper


router = APIRouter(
    prefix="/api/uploads",
    tags=["uploads"],
)

STORAGE_DIR = Path("storage/papers")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/papers")
async def upload_papers(
    files: Annotated[
        list[UploadFile],
        File(description="Upload one or more research paper PDFs"),
    ],
):
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files were uploaded.",
        )

    uploaded_files = []

    db = SessionLocal()

    try:
        for file in files:
            if not file.filename:
                continue

            if not file.filename.lower().endswith(".pdf"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{file.filename} is not a PDF.",
                )

            content = await file.read()

            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"{file.filename} exceeds the 20 MB limit.",
                )

            file_id = uuid4()
            stored_filename = f"{file_id}.pdf"
            file_path = STORAGE_DIR / stored_filename

            file_path.write_bytes(content)

            # Create database record for the paper.
            paper = Paper(
                title=Path(file.filename).stem,
                pdf_path=str(file_path),
                source="upload",
            )

            db.add(paper)
            db.commit()
            db.refresh(paper)

            # Extract PDF text, create chunks,
            # and save chunks to PostgreSQL.
            chunk_count = process_paper(
                db=db,
                paper_id=paper.id,
                pdf_path=file_path,
            )

            # Retrieval requires embeddings. Creating chunks alone would make
            # every question return an empty RAG result.
            embedded_chunk_count = embed_paper_chunks(
                db=db,
                paper_id=paper.id,
            )

            uploaded_files.append(
                {
                    "file_id": str(file_id),
                    "paper_id": str(paper.id),
                    "original_filename": file.filename,
                    "stored_filename": stored_filename,
                    "size_bytes": len(content),
                    "chunk_count": chunk_count,
                    "embedded_chunk_count": embedded_chunk_count,
                }
            )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

    return {
        "message": "Files uploaded and processed successfully.",
        "count": len(uploaded_files),
        "files": uploaded_files,
    }
