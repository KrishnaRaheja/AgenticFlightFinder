"""
Agentic Flight Deal Finder API Backend

Main FastAPI application that provides RESTful endpoints for managing flight preferences
and tracking flight deals. Features include:

- User authentication with Supabase
- Flight preference management (create, read, update, delete)
- Bearer token-based API security
- OpenAPI documentation with Swagger UI
- CORS support for frontend integration

The API uses Supabase for database and authentication services.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.openapi.utils import get_openapi
from backend.database import get_supabase
from backend.scheduler import start_scheduler

from backend.routes.preferences import router as preferences_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    logger.info(
        "Scheduler running in PT with daily monitoring and daily email delivery at configured schedule times"
    )
    yield


app = FastAPI(
    title="Agentic Flight Deal Finder API",
    description="AI-powered flight monitoring system",
    version="1.0.0",
    swagger_ui_parameters={"persistAuthorization": True},
    lifespan=lifespan,
)

logger = logging.getLogger(__name__)

# Configure Bearer token security
security = HTTPBearer()

# Add CORS middleware to allow requests from React frontend
_allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://*.vercel.app",
]
_frontend_url = os.getenv("FRONTEND_URL")
if _frontend_url:
    _allowed_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(preferences_router)


def custom_openapi():
    """Configure custom OpenAPI schema with Bearer token security."""
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    
    # Apply security globally to all endpoints
    for path in openapi_schema["paths"].values():
        for operation in path.values():
            if isinstance(operation, dict) and "security" not in operation:
                operation["security"] = [{"BearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Agentic Flight Deal Finder API is running"}


@app.get("/health")
async def health_check():
    """Tests database connection"""
    try:
        supabase = get_supabase()
        # Test database connection by querying flight_preferences table
        supabase.table("flight_preferences").select("count", count="exact").execute()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
