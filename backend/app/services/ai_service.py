import os
import re
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

openai_api_key = os.getenv("OPENAI_API_KEY")
openai_base_url = os.getenv("OPENAI_API_BASE")
openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
openai_client = None
if openai_api_key or openai_base_url:
    openai_client = OpenAI(
        api_key=openai_api_key or "ollama",
        base_url=openai_base_url or None,
    )

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


def _offline_answer(question: str) -> str:
    text = question.lower()

    recent_context = ""
    if "RECENT CONVERSATION:" in question:
        recent_context = question.split("RECENT CONVERSATION:", 1)[1]
        if "USER QUESTION:" in recent_context:
            recent_context = recent_context.split("USER QUESTION:", 1)[0].strip()

    if "USER QUESTION:" in question:
        question = question.split("USER QUESTION:", 1)[1].strip()

    text = question.lower()

    if "photosynthesis" in text:
        return (
            "Photosynthesis is the process plants, algae, and some bacteria use to convert light energy "
            "into chemical energy. Chlorophyll absorbs sunlight, usually in chloroplasts, while roots absorb "
            "water and leaves take in carbon dioxide. The basic process produces glucose for growth and "
            "stores energy; it also releases oxygen as a by-product.\n\n"
            "A simplified equation is: carbon dioxide + water + light energy -> glucose + oxygen. "
            "The light-dependent reactions capture energy, and the Calvin cycle uses that energy to build sugars."
        )

    greeting_only = (
        text.strip().strip(".,!?") in {"hello", "hi", "hey", "how are you", "good morning", "good evening"}
    )
    if greeting_only:
        return "Hello. I'm ready to help with general questions, explain concepts, compare ideas, or answer questions grounded in an uploaded research paper. What would you like to understand?"

    common_topics = {
        "gravity": "Gravity is the attraction between objects that have mass or energy. It keeps planets in orbit, gives objects weight, and is strongest near large masses.",
        "dna": "DNA is the molecule that stores hereditary instructions using a sequence of nucleotide bases. It is organized into genes and chromosomes and guides protein production. Each gene carries instructions for a functional product, commonly a protein.",
        "machine learning": "Machine learning is a field where systems learn patterns from data instead of following only fixed rules. A model is trained on examples, then used to predict or classify new data.",
        "artificial intelligence": "Artificial intelligence is the field that builds systems able to perform tasks associated with perception, reasoning, learning, language, and decision-making.",
        "climate change": "Climate change refers to long-term shifts in global or regional climate patterns. Human greenhouse-gas emissions are a major driver of recent warming.",
        "quantum": "Quantum mechanics describes matter and energy at atomic and subatomic scales. It uses probabilities and explains effects that classical physics cannot, such as quantization and superposition.",
        "atom": "An atom is matter's smallest unit that retains an element's chemical properties. It contains a dense nucleus of protons and neutrons, surrounded by electrons.",
    }

    for topic, explanation in common_topics.items():
        if topic in text:
            return explanation

    if "main research problem" in text or "research problem" in text:
        return (
            "A research problem is the specific gap, difficulty, or unanswered question that the study was created to address. "
            "To identify it accurately from a paper, I need the uploaded paper text or retrieved passages; a general answer alone cannot identify the paper-specific problem."
        )

    if "summarize" in text or "summary" in text:
        return (
            "I can provide a structured summary once the paper text or uploaded PDF is available. "
            "Share the text directly, or upload the PDF and use Generate summary."
        )

    if "who are you" in text or "what can you do" in text:
        return (
            "I'm ResearchPilot, a research assistant for questions, paper explanations, summaries, sources, and general information. "
            "For paper-specific answers, upload or select a PDF so the response can be grounded in document passages."
        )

    follow_up_markers = ("continue", "explain more", "tell me more", "what do you mean", "why", "how about", "and then")
    if any(marker in text for marker in follow_up_markers) and recent_context:
        assistant_lines = [
            line for line in recent_context.splitlines()
            if line.upper().startswith("ASSISTANT:")
        ]
        if assistant_lines:
            previous = assistant_lines[-1].replace("ASSISTANT:", "", 1).strip()
            return (
                "Building on the previous answer:\n\n"
                + previous[:900]
                + "\n\nHere is the next step: state the exact term or detail you want clarified, "
                  "and I'll expand that part with a concrete definition, example, and limitation."
            )

    cleaned = question.strip()
    for marker in ("USER QUESTION:", "The user asked:"):
        if marker in cleaned:
            cleaned = cleaned.split(marker, 1)[1].strip()

    if not cleaned:
        return "Please provide a question or topic, and I'll help explain it."

    return (
        f"Here is a useful starting point for '{cleaned}':\n\n"
        "1. Define the core concept or main term.\n"
        "2. Explain the key factors or mechanism involved.\n"
        "3. Give a practical example or application.\n"
        "4. Clarify the main limitation or common misunderstanding.\n\n"
        "This is a local offline explanation. Upload the relevant research paper for claims, citations, "
        "methods, limitations, and page-specific evidence."
    )


def generate_summary(paper_text: str) -> str:
    if openai_client is not None:
        prompt = f"Analyze this research paper text and produce the requested structured summary:\n\n{paper_text}"
        response = openai_client.chat.completions.create(
            model=openai_model,
            messages=[
                {"role": "system", "content": "You are ResearchPilot. Base every statement only on the supplied paper text. Be structured and precise."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
        )
        return response.choices[0].message.content or "I could not produce a summary."

    if client is None:
        import re

        text = re.sub(r"\s+", " ", paper_text).strip()
        sentences = [
            sentence.strip()
            for sentence in re.split(r"(?<=[.!?])\s+", text)
            if len(sentence.strip()) >= 35
        ]

        def relevant_sentences(keywords: tuple[str, ...], limit: int = 4) -> list[str]:
            ranked = sorted(
                sentences,
                key=lambda sentence: sum(
                    1 for keyword in keywords
                    if keyword in sentence.lower()
                ),
                reverse=True,
            )
            selected = [sentence for sentence in ranked if any(keyword in sentence.lower() for keyword in keywords)]
            return selected[:limit]

        tldr = relevant_sentences(("purpose", "objective", "study", "results", "proposes", "introduces", "finds"), 3)
        findings = relevant_sentences(("results", "found", "shows", "concludes", "demonstrates", "improved", "significant"), 5)
        methodology = relevant_sentences(("method", "dataset", "experiment", "analysis", "model", "sample", "procedure"), 4)
        limitations = relevant_sentences(("limit", "limitation", "bias", "constraint", "future", "not addressed"), 4)

        return (
            "**TL;DR**\n"
            + (" ".join(tldr[:2]) if tldr else text[:700])
            + "\n\n**Research Problem and Objectives**\n"
            + (" ".join(tldr) if tldr else "Not clearly stated in the extracted text.")
            + "\n\n**Methodology**\n"
            + (" ".join(methodology) if methodology else "Not clearly stated in the extracted text.")
            + "\n\n**Key Findings**\n"
            + (" ".join(findings) if findings else "Not clearly stated in the extracted text.")
            + "\n\n**Limitations and Future Work**\n"
            + (" ".join(limitations) if limitations else "Not clearly stated in the extracted text.")
        )

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

    if client is None:
        from app.services.embedding_service import generate_query_embedding
        return generate_query_embedding(text)

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
    if openai_client is not None:
        response = openai_client.chat.completions.create(
            model=openai_model,
            messages=[
                {"role": "system", "content": "You are ResearchPilot, a precise, useful, and well-structured AI research assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        return response.choices[0].message.content or "I could not produce an answer."

    if client is None:
        if "PAPER EXCERPTS:" in prompt:
            question = ""
            if "USER QUESTION:" in prompt:
                question = prompt.split("USER QUESTION:", 1)[1].split("PAPER EXCERPTS:", 1)[0].strip()

            excerpt_section = prompt.split("PAPER EXCERPTS:", 1)[1]
            excerpt_section = excerpt_section.split("RULES:", 1)[0].strip()
            lines = [line.strip() for line in excerpt_section.splitlines() if line.strip()]
            passage_lines = [
                line for line in lines
                if not line.startswith("[Paper:")
                and not line.startswith("[Page ")
                and not line.startswith("You are ResearchPilot")
            ]

            query_words = {
                word.strip(".,!?;:'\"()").lower()
                for word in question.split()
                if len(word.strip(".,!?;:'\"()")) > 3
            }
            ranked = sorted(
                passage_lines,
                key=lambda line: sum(word in line.lower() for word in query_words),
                reverse=True,
            )
            selected = ranked[:4]

            return (
                "Based on the selected paper passages:\n\n"
                + "\n\n".join(selected)
                + "\n\nThis answer is grounded in retrieved document text."
            )

        return _offline_answer(prompt)

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