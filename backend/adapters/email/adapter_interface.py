from abc import ABC, abstractmethod


class EmailAdapter(ABC):
    """Abstract email provider interface."""

    @abstractmethod
    async def send_email(self, to_email: str, subject: str, html_body: str) -> dict:
        """Send an email and return a normalized result dictionary."""
        raise NotImplementedError
