import os

from backend.email_adapters.adapter_interface import EmailAdapter
from backend.email_adapters.api_adapter import APIEmailAdapter
from backend.email_adapters.smtp_adapter import SMTPEmailAdapter


def get_email_adapter() -> EmailAdapter:
    provider = os.getenv("EMAIL_PROVIDER", "smtp").strip().lower()

    if provider == "smtp":
        return SMTPEmailAdapter()
    if provider == "api":
        return APIEmailAdapter()

    raise ValueError(
        f"Unsupported EMAIL_PROVIDER '{provider}'. Use 'smtp' or 'api'."
    )
