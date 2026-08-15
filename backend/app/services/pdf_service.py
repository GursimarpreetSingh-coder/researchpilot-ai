import re
from pathlib import Path

from pypdf import PdfReader


def clean_extracted_text(text: str) -> str:
    """
    Clean PDF text while preserving normal word boundaries.
    """

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove spaces before punctuation.
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)

    # Normalize spaces/tabs.
    text = re.sub(r"[ \t]+", " ", text)

    # Remove spaces around hyphen when they are clearly extraction artifacts.
    text = re.sub(r"\s*-\s*", "-", text)

    # Normalize excessive blank lines.
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def extract_pdf_text(file_path: Path) -> list[dict]:
    reader = PdfReader(str(file_path))

    pages = []

    for page_number, page in enumerate(reader.pages, start=1):
        raw_text = page.extract_text() or ""

        cleaned_text = clean_extracted_text(raw_text)

        if cleaned_text:
            pages.append(
                {
                    "page_number": page_number,
                    "text": cleaned_text,
                }
            )

    return pages