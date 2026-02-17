from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import get_supabase

from backend.routes.preferences import router as preferences_router

app = FastAPI(
    title="Agentic Flight Deal Finder API",
    description="AI-powered flight monitoring system",
    version="1.0.0"
)

# Add CORS middleware to allow requests from React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(preferences_router)


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
