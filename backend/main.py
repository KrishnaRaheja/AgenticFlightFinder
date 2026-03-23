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

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from backend.database import get_supabase
from backend.limiter import limiter
from backend.scheduler import start_scheduler

from backend.routes.preferences import router as preferences_router

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    traces_sample_rate=0.1,
    environment=os.getenv("RAILWAY_ENVIRONMENT", "development"),
)


class _BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        cl = request.headers.get("content-length")
        if cl and int(cl) > 8_192:  # 8 KB — 16× the largest valid payload
            return Response("Request too large", status_code=413)
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.scheduler = start_scheduler()
    logger.info(
        "Scheduler running in PT with daily monitoring and daily email delivery at configured schedule times"
    )
    yield
    app.state.scheduler.shutdown(wait=False)


app = FastAPI(
    title="Agentic Flight Deal Finder API",
    description="AI-powered flight monitoring system",
    version="1.0.0",
    swagger_ui_parameters={"persistAuthorization": True},
    lifespan=lifespan,
)

logger = logging.getLogger(__name__)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(_BodySizeLimitMiddleware)

# Add CORS middleware to allow requests from React frontend
_allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://flightfinders.org",
    "https://www.flightfinders.org",
]
_frontend_url = os.getenv("FRONTEND_URL")
if _frontend_url:
    _allowed_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
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
    """Tests database connection and scheduler health."""
    checks: dict[str, str] = {}
    try:
        supabase = get_supabase()
        supabase.table("flight_preferences").select("count", count="exact").execute()
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
    scheduler = getattr(app.state, "scheduler", None)
    checks["scheduler"] = "ok" if (scheduler and scheduler.running) else "error"
    overall = "healthy" if all(v == "ok" for v in checks.values()) else "unhealthy"
    return {"status": overall, **checks}
