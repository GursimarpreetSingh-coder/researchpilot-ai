import re


def create_chunks(
    pages: list[dict],
    chunk_size: int = 1800,
    overlap: int = 300,
) -> list[dict]:

    chunks = []
    chunk_index = 0

    for page in pages:
        text = re.sub(r"\s+", " ", page["text"]).strip()
        page_number = page["page_number"]
        sentences = re.split(r"(?<=[.!?])\s+", text)

        current = ""
        overlap_text = ""

        for sentence in sentences:
            candidate = f"{current} {sentence}".strip()
            if len(candidate) > chunk_size and current:
                chunk_text = f"{overlap_text} {current}".strip()
                chunks.append(
                    {
                        "chunk_index": chunk_index,
                        "page_number": page_number,
                        "content": chunk_text,
                    }
                )
                chunk_index += 1

                overlap_text = current[-overlap:].strip()
                current = sentence
            else:
                current = candidate

        if current:
            chunk_text = f"{overlap_text} {current}".strip()
            chunks.append(
                {
                    "chunk_index": chunk_index,
                    "page_number": page_number,
                    "content": chunk_text,
                }
            )
            chunk_index += 1

    return chunks