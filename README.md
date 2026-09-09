# ResearchPilot AI

<p align="center">
  <img src="frontend/public/researchpilot-logo.svg" alt="ResearchPilot AI logo" width="150" />
</p>

<p align="center">
  <strong>Turn research papers into grounded, searchable insights.</strong>
  <br />
  Upload papers, ask questions, compare documents, and explore scientific literature with an AI research workspace.
</p>

<p align="center">
  <a href="https://github.com/GursimarpreetSingh-coder/researchpilot-ai"><img src="https://img.shields.io/badge/status-active-4f46e5" alt="Project status" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/frontend-Next.js-black" alt="Next.js" /></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/backend-FastAPI-009688" alt="FastAPI" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/database-PostgreSQL-4169e1" alt="PostgreSQL" /></a>
  <a href="https://ai.google.dev/gemini-api/docs"><img src="https://img.shields.io/badge/AI-Gemini-4285f4" alt="Google Gemini" /></a>
</p>

## Product Preview

<p align="center">
  <img src="docs/screenshots/researchpilot-workspace.png" alt="ResearchPilot AI research workspace" width="1100" />
</p>

ResearchPilot is designed as a calm, professional research environment rather than a generic chatbot. The workspace combines a paper-aware conversation, source references, PDF access, paper metadata, responsive navigation, and AI-assisted analysis in one interface.

## Why ResearchPilot?

Research work is often split across PDF readers, search tabs, notes, citation managers, and chat tools. ResearchPilot brings the first research loop into one place:

- Upload and process one or several PDF research papers.
- Ask questions grounded in retrieved paper excerpts.
- Compare ideas, methods, findings, and limitations across papers.
- Receive page and chunk references for evidence-based answers.
- Ask general questions outside the selected paper without fabricating citations.
- Use voice input, responsive layouts, light/dark themes, and persistent conversations.

## Core Capabilities

| Capability | What it does |
| --- | --- |
| PDF ingestion | Accepts multiple PDFs in one upload flow, extracts page text, chunks content, and creates embeddings. |
| Grounded Q&A | Retrieves semantically relevant chunks and asks Gemini to answer with evidence. |
| Multi-paper comparison | Associates several papers with one conversation and retrieves across the combined paper set. |
| Source traceability | Returns paper title, page number, and chunk index for retrieved evidence. |
| General AI mode | Routes questions outside the selected paper to general knowledge without fake paper citations. |
| Paper reader | Opens the selected PDF and can jump to cited pages. |
| Conversation workspace | Stores conversations and messages in PostgreSQL with clear-history controls. |
| Voice input | Uses browser speech recognition and preserves final transcript segments without duplication. |
| Research UI | Responsive workspace with sidebar history, paper details, quick actions, theme settings, and math rendering. |

## How It Works

```mermaid
flowchart LR
    U[Researcher] --> UI[Next.js workspace]
    UI -->|Upload PDF or PDFs| API[FastAPI API]
    API --> PDF[PDF text extraction]
    PDF --> CH[Page-aware chunking]
    CH --> EMB[Gemini embeddings]
    EMB --> DB[(PostgreSQL)]
    UI -->|Ask question| API
    API --> RET[Cosine similarity retrieval]
    DB --> RET
    RET --> CTX[Evidence context with paper/page/chunk labels]
    CTX --> LLM[Gemini answer generation]
    LLM --> UI
```

### Multi-paper comparison flow

```mermaid
flowchart TD
    A[Select multiple research PDFs] --> B[Upload and validate files]
    B --> C[Create one Paper record per file]
    C --> D[Extract text and create chunks]
    D --> E[Generate embeddings]
    E --> F[Link papers to one conversation]
    F --> G[Ask comparison question]
    G --> H[Retrieve top chunks across all linked papers]
    H --> I[Label evidence by paper and page]
    I --> J[Generate similarities, differences, and synthesis]
```

### Question routing

```mermaid
flowchart TD
    Q[User question] --> E[Create query embedding]
    E --> S{Relevant paper evidence?}
    S -->|Yes| R[Use retrieved excerpts]
    R --> P[Answer with citations]
    S -->|No| G[Use general AI knowledge]
    G --> N[Answer without paper citations]
```

## Technical Methods

### 1. PDF processing

Each uploaded PDF is stored as a paper record. Text is extracted page by page, cleaned, and split into chunks while retaining page numbers. This keeps later answers traceable to the document location.

### 2. Embedding-based retrieval

The query and paper chunks are represented as vectors using the configured Gemini embedding model. ResearchPilot calculates cosine similarity in the service layer and selects the highest-scoring chunks for the answer context.

For vectors $a$ and $b$, cosine similarity is:

$$
\operatorname{similarity}(a,b) = \frac{a \cdot b}{\|a\|\|b\|}
$$

### 3. Evidence-grounded generation

Retrieved context is sent to Gemini with explicit instructions to:

- Separate paper evidence from general knowledge.
- Avoid invented facts and citations.
- Mention page numbers when paper evidence is used.
- Compare evidence across paper titles when multiple papers are linked.

### 4. Relevance routing

A similarity threshold decides whether the question is sufficiently related to the selected papers. Paper-related questions use RAG. Out-of-paper questions receive a useful general answer with an explicit note that the answer did not come from the paper.

### 5. Conversation persistence

Users, papers, conversations, messages, paper chunks, embeddings, and multi-paper associations are stored in PostgreSQL. Alembic migrations maintain the schema, including the `conversation_papers` join table used for comparisons.

## Project Structure

```text
ResearchPilot-AI/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes: uploads, papers, chat, health
│   │   ├── core/             # Environment-backed settings
│   │   ├── db/               # SQLAlchemy base, session, model registry
│   │   ├── models/           # User, paper, chunk, conversation, message models
│   │   └── services/         # PDF, chunking, embeddings, retrieval, RAG, AI
│   ├── alembic/              # Database migrations
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/                  # Next.js page, layout, global design system
│   ├── components/           # Theme and reusable UI components
│   ├── public/               # Logo and static assets
│   ├── package.json
│   └── .env.example
├── docs/screenshots/         # Product screenshots used in documentation
├── render.yaml               # Render backend and PostgreSQL blueprint
├── DEPLOYMENT.md             # Deployment instructions
└── README.md
```

## API Surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API and database health. |
| `POST` | `/api/uploads/papers` | Upload and process one or more PDFs. |
| `GET` | `/api/papers/{paper_id}` | Read paper metadata. |
| `GET` | `/api/papers/{paper_id}/pdf` | Stream a stored PDF. |
| `POST` | `/api/papers/{paper_id}/ask` | Ask a question about one paper. |
| `POST` | `/api/conversations` | Create a single-paper or multi-paper conversation. |
| `GET` | `/api/conversations?user_id=...` | List a user's conversations. |
| `GET` | `/api/conversations/{conversation_id}` | Load messages and conversation state. |
| `POST` | `/api/conversations/{conversation_id}/chat` | Run RAG/general AI chat. |
| `POST` | `/api/conversations/clear?user_id=...` | Clear a user's conversation history. |
| `DELETE` | `/api/conversations/{conversation_id}?user_id=...` | Delete one conversation. |

## Run Locally

### Requirements

- Node.js 20 or newer
- Python 3.11 or newer
- PostgreSQL
- A Gemini API key with available quota

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env with DATABASE_URL and GEMINI_API_KEY
alembic upgrade head
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

### Backend `.env`

```env
DATABASE_URL=postgresql://user:password@host:5432/researchpilot
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Never commit real environment files, API keys, database URLs, uploaded PDFs, or virtual environments.

## Deployment

The recommended production split is:

- **Vercel** for `frontend/`.
- **Render, Railway, or Fly.io** for `backend/`.
- **Managed PostgreSQL** for application data.
- **Object storage** such as S3, Cloudflare R2, or Supabase Storage for production PDFs.

### Vercel

Set the project root to `frontend` and configure:

```text
NEXT_PUBLIC_API_URL=https://your-backend.example.com
```

### Render

The root `render.yaml` defines a FastAPI service and PostgreSQL database. Add these secret values in the Render dashboard:

```text
GEMINI_API_KEY=...
CORS_ORIGINS=https://your-app.vercel.app
```

Then run the migrations:

```bash
alembic upgrade head
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full deployment sequence and the local-storage caveat.

## Testing and Validation

```powershell
# Frontend production build
cd frontend
npm run build

# Backend syntax check
cd ..\backend
.\venv\Scripts\python.exe -m compileall -q app alembic

# API health check
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

The AI provider can return `429 RESOURCE_EXHAUSTED` when a Gemini free-tier quota is reached. The backend reports this as HTTP 429 with retry information. Configure billing, a different API key, or a fallback model with available quota for higher throughput.

## Future Improvements

### Near term

- Add streaming token responses for faster perceived answers.
- Add a comparison table view for methodology, datasets, metrics, and limitations.
- Add paper-level filters for author, year, topic, venue, and citation metadata.
- Improve retrieval with hybrid keyword plus vector search and reranking.
- Add background jobs for large multi-paper uploads.

### Production scale

- Move PDF files from local disk to durable object storage.
- Add authentication, team workspaces, and role-based access.
- Add rate limiting, usage quotas, request tracing, and provider failover.
- Add pgvector or a managed vector database for larger collections.
- Add document-level OCR for scanned PDFs and tables/equations extraction.

### Research intelligence

- Build citation graphs and related-paper discovery.
- Generate structured literature-review matrices.
- Detect conflicting findings across papers.
- Track claims, evidence, and citation provenance.
- Add export to Markdown, DOCX, BibTeX, and research notes.

## Responsible AI Notes

ResearchPilot is an assistant, not a replacement for reading the original publication. Always verify important claims against the paper, especially when PDFs contain poor extraction, figures, tables, or mathematical notation. General-knowledge answers are intentionally marked as not originating from the selected paper.

## License

No license has been declared yet. Add a license file before distributing the project publicly or accepting external contributions.

## Author

Built by [Gursimarpreet Singh](https://github.com/GursimarpreetSingh-coder).
