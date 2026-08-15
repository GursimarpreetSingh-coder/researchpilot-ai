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

        return {
            "status": "healthy",
            "service": "ResearchPilot AI",
            "database": "connected",
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "ResearchPilot AI",
            "database": "disconnected",
            "error": str(e),
        }