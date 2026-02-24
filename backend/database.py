"""
Database Module

Manages Supabase client initialization and configuration.
Loads database credentials from environment variables and provides
a singleton Supabase client instance for all database operations.
"""

from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

# Get credentials from .env
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def get_supabase() -> Client:
    """Returns the Supabase client for database operations"""
    return supabase