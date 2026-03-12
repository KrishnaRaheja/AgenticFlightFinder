import os

from backend.adapters.email.adapter_interface import EmailAdapter
from backend.adapters.email.api_adapter import APIEmailAdapter
from backend.adapters.email.smtp_adapter import SMTPEmailAdapter


def get_email_adapter() -> EmailAdapter:
    provider = os.getenv("EMAIL_PROVIDER", "smtp").strip().lower()

    if provider == "smtp":
        return SMTPEmailAdapter()
    if provider == "api":
        return APIEmailAdapter()

    raise ValueError(
        f"Unsupported EMAIL_PROVIDER '{provider}'. Use 'smtp' or 'api'."
    )
