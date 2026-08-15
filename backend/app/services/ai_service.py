import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not set in .env")

client = genai.Client(api_key=api_key)

MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

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

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
    )

    return response.embeddings[0].values
def generate_answer(prompt: str) -> str:
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
    )

    return response.text