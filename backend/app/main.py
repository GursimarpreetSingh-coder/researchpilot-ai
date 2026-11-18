from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from app.api.uploads import router as upload_router
from app.api.health import router as health_router
from app.core.config import settings
from app.api.questions import router as questions_router
from app.api.conversations import router as conversations_router
app = FastAPI(
    title=settings.app_name,
    description="AI-powered research paper assistant",
    version=settings.app_version,
)
app.include_router(upload_router)
app.include_router(questions_router)
app.include_router(conversations_router)


@app.on_event("startup")
def initialize_database():
    from sqlalchemy import inspect, text

    from app.db import models as _models  # noqa: F401
    from app.db.base import Base
    from app.db.session import engine

    Base.metadata.create_all(bind=engine)

    if settings.database_url.startswith("sqlite"):
        inspector = inspect(engine)
        conversation_columns = {
            column["name"]
            for column in inspector.get_columns("conversations")
        }
        with engine.begin() as connection:
            if "archived" not in conversation_columns:
                connection.execute(text("ALTER TABLE conversations ADD COLUMN archived BOOLEAN NOT NULL DEFAULT 0"))
            if "archived_at" not in conversation_columns:
                connection.execute(text("ALTER TABLE conversations ADD COLUMN archived_at DATETIME NULL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.cors_origins.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    health_router,
    prefix="/api",
)
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="ResearchPilot AI",
        version="1.0.0",
        description="AI-powered research paper assistant",
        routes=app.routes,
    )

    openapi_schema["openapi"] = "3.0.3"

    # Fix Swagger's rendering of multiple PDF uploads
    upload_path = openapi_schema["paths"].get("/api/uploads/papers")

    if upload_path:
        post_operation = upload_path.get("post")

        if post_operation:
            request_body = post_operation.get("requestBody")

            if request_body:
                multipart = request_body.get("content", {}).get(
                    "multipart/form-data"
                )

                if multipart:
                    schema = multipart.get("schema")

                    if schema and "properties" in schema:
                        files_property = schema["properties"].get("files")

                        if files_property:
                            files_property["type"] = "array"
                            files_property["items"] = {
                                "type": "string",
                                "format": "binary",
                            }

    app.openapi_schema = openapi_schema
    return app.openapi_schema
