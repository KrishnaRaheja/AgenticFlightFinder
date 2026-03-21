"""
Database Module

Manages Supabase client initialization and configuration.

Two clients are provided:
- get_supabase(): service-role client for admin/scheduler operations (bypasses RLS).
  Use only in background jobs (scheduler, Claude monitoring) that must access all users' data.
- get_user_supabase(jwt): anon client scoped to a user's JWT for request-time operations.
  PostgREST enforces RLS with this client, so bugs cannot leak cross-user data.
  Requires RLS policies to be enabled on the relevant tables in Supabase.
"""

from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file")

if not SUPABASE_ANON_KEY:
    raise ValueError("Missing SUPABASE_ANON_KEY in .env file")

# Service-role singleton — only for background jobs that need full DB access.
_service_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_supabase() -> Client:
    """Service-role client. Bypasses RLS — use only in scheduler/monitoring."""
    return _service_client


def get_user_supabase(jwt_token: str) -> Client:
    """
    Returns a Supabase client whose PostgREST calls are authenticated with the
    user's JWT. Supabase enforces RLS policies for this client, so a bug in the
    application layer cannot read or write another user's rows.

    Requires RLS policies to be configured in the Supabase dashboard.
    """
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    client.postgrest.auth(jwt_token)
    return client