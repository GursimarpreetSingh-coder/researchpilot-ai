import os
import re
from pathlib import Path

from dotenv import load_dotenv
from google import genai

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not set in .env")

client = genai.Client(api_key=api_key)

MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "")


class ProviderRateLimitError(RuntimeError):
    """Raised when all configured text-generation models are rate limited."""

    def __init__(self, retry_seconds: int | None = None):
        self.retry_seconds = retry_seconds
        retry_message = (
            f" Please retry in about {retry_seconds} seconds."
            if retry_seconds is not None
            else " Please retry later."
        )
        super().__init__(
            "The AI provider quota has been reached. Configure billing, "
            "another API key, or GEMINI_FALLBACK_MODEL." + retry_message
        )

# IMPORTANT:
# This must be the same embedding model used when
# we created the 128 embeddings for your paper.
EMBEDDING_MODEL = os.getenv(
    "GEMINI_EMBEDDING_MODEL",
    "gemini-embedding-001",
)


def generate_summary(paper_text: str) -> str:
    prompt = f"""
You are ResearchPilot, an AI research-paper assistant.

Analyze the research paper text provided below.

Create a concise but useful research summary with these sections:

1. TL;DR
2. Research Problem
3. Objectives
4. Methodology
5. Key Findings
6. Results
7. Limitations
8. Future Work
9. Important Keywords

Rules:

- Base the summary ONLY on the provided paper text.
- Do not invent information.
- If something is not available, say:
  "Not clearly stated in the provided text."
- Preserve important technical terminology.
- Write for a university student or researcher.
- Be precise and useful.

## PAPER TEXT:

{paper_text}
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
    )

    return response.text


def generate_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector for a piece of text.

    The same embedding model must be used for:
    - paper chunks
    - user questions
    """

    try:
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )
    except Exception as error:
        if "429" in str(error) or "RESOURCE_EXHAUSTED" in str(error):
            retry_match = re.search(r"retry in ([0-9.]+)s", str(error), re.IGNORECASE)
            retry_seconds = int(float(retry_match.group(1))) if retry_match else None
            raise ProviderRateLimitError(retry_seconds) from error
        raise

    return response.embeddings[0].values
def generate_answer(prompt: str) -> str:
    models = [MODEL]
    if FALLBACK_MODEL and FALLBACK_MODEL != MODEL:
        models.append(FALLBACK_MODEL)

    last_error: Exception | None = None
    for model in models:
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
            )
            return response.text
        except Exception as error:
            last_error = error
            if "429" not in str(error) and "RESOURCE_EXHAUSTED" not in str(error):
                raise

    retry_match = re.search(r"retry in ([0-9.]+)s", str(last_error), re.IGNORECASE)
    retry_seconds = int(float(retry_match.group(1))) if retry_match else None
    raise ProviderRateLimitError(retry_seconds) from last_error