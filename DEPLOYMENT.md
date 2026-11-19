# Deployment

> **Free-tier note:** The free Render setup is suitable for a temporary demo, not permanent data storage. Free web services sleep after 15 minutes without traffic, and free Render Postgres expires after 30 days. The backend's uploaded PDFs are stored on an ephemeral filesystem and can disappear when the service restarts or redeploys. Use paid compute plus persistent storage before keeping irreplaceable uploads here.

## GitHub

The repository contains two deployable applications:

- `frontend/`: Next.js application for Vercel
- `backend/`: FastAPI application for Render, Railway, or Fly.io

Do not commit `.env` files, API keys, database credentials, `backend/storage/`, or virtual environments.

## Backend on Render

The root `render.yaml` defines a FastAPI service and PostgreSQL database on Render's free plans.

1. Create a Render Blueprint from this repository.
2. Set `GEMINI_API_KEY` in the backend service environment.
3. The Blueprint allows `https://researchpilot-ai-roan.vercel.app`. Update `CORS_ORIGINS` if the frontend domain changes.
4. Deploy and copy the backend URL, for example `https://researchpilot-api.onrender.com`.
5. Run migrations from the backend service shell if required:

```bash
alembic upgrade head
```

`backend/storage/` is local disk storage and is ignored by Git. On a free Render web service, this directory is ephemeral: uploaded PDFs may be lost after restarts, redeploys, or idle spin-down. For long-term use, move uploads to S3, Cloudflare R2, Supabase Storage, or attach a paid Render persistent disk.

## Frontend on Vercel

1. Import the same GitHub repository into Vercel.
2. Set the project root directory to `frontend`.
3. Set the environment variable:

```text
NEXT_PUBLIC_API_URL=https://your-backend-host.example.com
```

4. Deploy.
5. If the Vercel URL changes, update `CORS_ORIGINS` in Render and redeploy the backend.

## Local development

Backend:

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm run dev
```
