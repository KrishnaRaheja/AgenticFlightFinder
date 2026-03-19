from backend.adapters.email.adapter_interface import EmailAdapter
from backend.adapters.email.api_adapter import ResendEmailAdapter
from backend.adapters.email.factory import get_email_adapter
from backend.adapters.email.smtp_adapter import SMTPEmailAdapter

__all__ = [
    "EmailAdapter",
    "SMTPEmailAdapter",
    "ResendEmailAdapter",
    "get_email_adapter",
]
