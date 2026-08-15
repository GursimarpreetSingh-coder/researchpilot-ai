from uuid import UUID

from app.db.session import SessionLocal
from app.services.rag_service import answer_question


PAPER_ID = UUID(
    "fce118f6-84ab-4429-8d58-d1fdbc280701"
)

question = """
What are the main strategies described in the paper
for helping forest and farm producer organisations
develop internal finance?
"""


db = SessionLocal()

try:
    print("\n==============================")
    print("ResearchPilot RAG")
    print("==============================\n")

    result = answer_question(
        db=db,
        paper_id=PAPER_ID,
        question=question,
        top_k=5,
    )

    print("ANSWER:")
    print(result["answer"])

    print("\nSOURCES:")

    for source in result["sources"]:
        print(
            f"- Page {source['page_number']}, "
            f"Chunk {source['chunk_index']}"
        )

finally:
    db.close()