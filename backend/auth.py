"""
Authentication Module

Handles JWT token validation and user authentication for FastAPI endpoints.
Provides a dependency function that validates Supabase JWT tokens from
Authorization headers and returns the authenticated user's ID.
"""

from typing import Optional

from fastapi import Depends, Header, HTTPException

from backend.database import get_supabase


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
	"""Dependency that validates Supabase JWT token and returns user_id."""
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
		return user.id
	except HTTPException:
		raise
	except Exception:
		raise HTTPException(status_code=401, detail="Authentication failed")
