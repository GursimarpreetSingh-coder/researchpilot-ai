from pathlib import Path

from app.services.pdf_service import extract_pdf_text
from app.services.chunk_service import create_chunks


pdf_path = Path(
    "storage/papers/df569f8b-c6b4-4c8b-bbec-697204de4b27.pdf"
)

pages = extract_pdf_text(pdf_path)

print(f"Pages with extracted text: {len(pages)}")

if pages:
    print("\n--- FIRST PAGE ---\n")
    print(pages[0]["text"][:2000])

chunks = create_chunks(pages)

print(f"\nTotal chunks: {len(chunks)}")

if chunks:
    print("\n--- FIRST CHUNK ---\n")
    print(chunks[0]["content"][:2000])