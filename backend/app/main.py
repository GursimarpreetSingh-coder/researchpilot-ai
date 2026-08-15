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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
"https://researchpilot-ai-roan.vercel.app",
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
