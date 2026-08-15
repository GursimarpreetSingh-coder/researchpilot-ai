import os

from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

MODEL = "gemini-embedding-001"


def generate_document_embedding(text: str) -> list[float]:
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
    response = client.models.embed_content(
        model=MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=768,
        ),
    )

    return response.embeddings[0].values