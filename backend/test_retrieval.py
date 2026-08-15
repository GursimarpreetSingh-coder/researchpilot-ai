from uuid import UUID

from app.db.session import SessionLocal
from app.services.retrieval_service import retrieve_relevant_chunks


PAPER_ID = UUID(
    "fce118f6-84ab-4429-8d58-d1fdbc280701"
)

QUERY = (
    "What are the main financial challenges faced by "
    "forest and farm producer organisations?"
)


db = SessionLocal()

try:
    print("\nSearching the paper...\n")

    results = retrieve_relevant_chunks(
        db=db,
        paper_id=PAPER_ID,
        query=QUERY,
        top_k=5,
    )

    print("=" * 80)
    print("TOP RELEVANT CHUNKS")
    print("=" * 80)

    for i, result in enumerate(results, start=1):
        print(f"\nRESULT #{i}")
        print(f"Similarity : {result['similarity']:.4f}")
        print(f"Chunk      : {result['chunk_index']}")
        print(f"Page       : {result['page_number']}")
        print("-" * 80)
        print(result["content"][:1000])
        print()

finally:
    db.close()