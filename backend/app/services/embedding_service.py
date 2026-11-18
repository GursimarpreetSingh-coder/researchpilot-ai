import os

from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

MODEL = "gemini-embedding-001"
DIMENSION = 768


def _offline_embedding(text: str) -> list[float]:
    import hashlib

    normalized = " ".join(text.lower().split())
    words = normalized.replace("-", " ").split()
    vector = [0.0] * DIMENSION

    if not words:
        return vector

    for word in words:
        digest = hashlib.blake2b(word.encode("utf-8"), digest_size=8).digest()
        index = int.from_bytes(digest[:4], "little") % DIMENSION
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign

    magnitude = sum(value * value for value in vector) ** 0.5
    if magnitude:
        vector = [value / magnitude for value in vector]
    return vector


def generate_document_embedding(text: str) -> list[float]:
    if client is None:
        return _offline_embedding(text)

    response = client.models.embed_content(
        model=MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=768,
        ),
    )

    return response.embeddings[0].values


def generate_query_embedding(text: str) -> list[float]:
    if client is None:
        return _offline_embedding(text)

    response = client.models.embed_content(
        model=MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=768,
        ),
    )

    return response.embeddings[0].values