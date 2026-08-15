def create_chunks(
    pages: list[dict],
    chunk_size: int = 1200,
    overlap: int = 200,
) -> list[dict]:

    chunks = []
    chunk_index = 0

    for page in pages:
        text = page["text"]
        page_number = page["page_number"]

        start = 0

        while start < len(text):
            end = start + chunk_size

            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append(
                    {
                        "chunk_index": chunk_index,
                        "page_number": page_number,
                        "content": chunk_text,
                    }
                )

                chunk_index += 1

            start += chunk_size - overlap

    return chunks