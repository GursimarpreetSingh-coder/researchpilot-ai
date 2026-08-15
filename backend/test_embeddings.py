import app.db.models

from app.db.session import SessionLocal
from app.services.embedding_processor import embed_paper_chunks


PAPER_ID = "fce118f6-84ab-4429-8d58-d1fdbc280701"


print("Generating embeddings...")

db = SessionLocal()

try:
    count = embed_paper_chunks(
        db=db,
        paper_id=PAPER_ID,
    )

    print()
    print("==============================")
    print(f"Embeddings created: {count}")
    print("==============================")

finally:
    db.close()