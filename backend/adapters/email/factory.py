import os

from backend.adapters.email.adapter_interface import EmailAdapter
from backend.adapters.email.api_adapter import ResendEmailAdapter
from backend.adapters.email.smtp_adapter import SMTPEmailAdapter


def get_email_adapter() -> EmailAdapter:
    provider = os.getenv("EMAIL_PROVIDER", "resend").strip().lower()

    if provider == "smtp":
        return SMTPEmailAdapter()
    if provider == "resend":
        return ResendEmailAdapter()

    raise ValueError(
        f"Unsupported EMAIL_PROVIDER '{provider}'. Use 'smtp' or 'resend'."
    )
