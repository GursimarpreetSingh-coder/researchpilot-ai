from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import engine

router = APIRouter()


@router.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            result.fetchone()

        ai = {
            "configured": False,
            "provider": "none",
        }
        from app.services.ai_service import client, openai_client
        if openai_client is not None:
            ai = {"configured": True, "provider": "openai-compatible"}
        elif client is not None:
            ai = {"configured": True, "provider": "gemini"}

        return {
            "status": "healthy",
            "service": "ResearchPilot AI",
            "database": "connected",
            "ai": ai,
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "ResearchPilot AI",
            "database": "disconnected",
            "error": str(e),
        }