# Deployment

## GitHub

The repository contains two deployable applications:

- `frontend/`: Next.js application for Vercel
- `backend/`: FastAPI application for Render, Railway, or Fly.io

Do not commit `.env` files, API keys, database credentials, `backend/storage/`, or virtual environments.

## Backend on Render

The root `render.yaml` defines a FastAPI service and PostgreSQL database.

1. Create a Render Blueprint from this repository.
2. Set `GEMINI_API_KEY` in the backend service environment.
3. Set `CORS_ORIGINS` to the final Vercel URL, for example `https://your-app.vercel.app`.
4. Deploy and copy the backend URL, for example `https://researchpilot-api.onrender.com`.
5. Run migrations from the backend service shell if required:

```bash
alembic upgrade head
```

`backend/storage/` is local disk storage and is ignored by Git. Render web-service disks are not a durable place for user PDFs, so production uploads should eventually move to S3, Cloudflare R2, Supabase Storage, or another object store.

## Frontend on Vercel

1. Import the same GitHub repository into Vercel.
2. Set the project root directory to `frontend`.
3. Set the environment variable:

```text
NEXT_PUBLIC_API_URL=https://your-backend-host.example.com
```

4. Deploy.
5. Add the final Vercel URL to the backend `CORS_ORIGINS` variable and redeploy the backend.

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
