from uuid import UUID

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.paper import Paper
from app.services.rag_service import answer_question


router = APIRouter(
    prefix="/api/papers",
    tags=["questions"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class QuestionRequest(BaseModel):
    question: str
    top_k: int = 5


@router.get("/{paper_id}")
def get_paper(
    paper_id: UUID,
    db: Session = Depends(get_db),
):
    paper = db.get(Paper, paper_id)

    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    return {
        "id": str(paper.id),
        "title": paper.title,
        "source": paper.source,
        "pdf_url": f"/api/papers/{paper.id}/pdf" if paper.pdf_path else None,
    }


@router.get("/{paper_id}/pdf")
def get_paper_pdf(
    paper_id: UUID,
    db: Session = Depends(get_db),
):
    paper = db.get(Paper, paper_id)

    if not paper or not paper.pdf_path:
        raise HTTPException(status_code=404, detail="PDF not found.")

    pdf_path = Path(paper.pdf_path)

    if not pdf_path.is_file():
        raise HTTPException(status_code=404, detail="PDF file is unavailable.")

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{paper.title}.pdf",
    )


@router.get("/{paper_id}/summary")
def get_paper_summary(paper_id: UUID, db: Session = Depends(get_db)):
    paper = db.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    from app.services.summary_service import generate_paper_summary

    try:
        summary = generate_paper_summary(db=db, paper_id=paper_id)
        return {
            "paper_id": str(paper_id),
            "summary": summary.summary,
            "key_contributions": summary.key_contributions,
            "methodology": summary.methodology,
            "limitations": summary.limitations,
        }
    except Exception as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.post("/{paper_id}/ask")
def ask_paper(
    paper_id: UUID,
    request: QuestionRequest,
    db: Session = Depends(get_db),
):
    paper = db.get(Paper, paper_id)

    if not paper:
        raise HTTPException(
            status_code=404,
            detail="Paper not found.",
        )

    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    result = answer_question(
        db=db,
        paper_id=paper_id,
        question=request.question,
        top_k=request.top_k,
    )

    return {
        "paper_id": str(paper_id),
        "question": request.question,
        "answer": result["answer"],
        "sources": result["sources"],
    }
