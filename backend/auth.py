"""
Authentication Module

Handles JWT token validation and user authentication for FastAPI endpoints.
Provides a dependency function that validates Supabase JWT tokens from
Authorization headers and returns an AuthContext containing the user_id and
the raw JWT (needed to create user-scoped database clients that enforce RLS).
"""

from dataclasses import dataclass
from typing import Optional

from fastapi import Header, HTTPException

from backend.database import get_supabase


@dataclass
class AuthContext:
    user_id: str
    token: str


async def get_current_user(authorization: Optional[str] = Header(None)) -> AuthContext:
    """Dependency that validates a Supabase JWT and returns an AuthContext."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Invalid authorization header format"
        )

    token = authorization.split("Bearer ", 1)[1]
    supabase = get_supabase()

    try:
        response = supabase.auth.get_user(token)
        user = getattr(response, "user", None)
        if not user or not getattr(user, "id", None):
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return AuthContext(user_id=user.id, token=token)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")
