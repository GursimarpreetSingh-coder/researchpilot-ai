import app.db.models

from app.db.session import SessionLocal
from app.services.summary_service import generate_paper_summary

PAPER_ID = "fce118f6-84ab-4429-8d58-d1fdbc280701"

print("Generating AI summary for the real paper...")

db = SessionLocal()

try:
    result = generate_paper_summary(
        db=db,
        paper_id=PAPER_ID,
    )

    print("\n========== SUMMARY RESULT ==========")
    print(result)
    print("====================================")

finally:
    db.close()