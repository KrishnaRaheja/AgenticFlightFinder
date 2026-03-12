from backend.email_adapters.adapter_interface import EmailAdapter
from backend.email_adapters.api_adapter import APIEmailAdapter
from backend.email_adapters.factory import get_email_adapter
from backend.email_adapters.smtp_adapter import SMTPEmailAdapter

__all__ = [
    "EmailAdapter",
    "SMTPEmailAdapter",
    "APIEmailAdapter",
    "get_email_adapter",
]
