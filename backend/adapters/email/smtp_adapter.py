import logging
import os
from email.message import EmailMessage

from aiosmtplib import SMTPException, send

from backend.adapters.email.adapter_interface import EmailAdapter

logger = logging.getLogger(__name__)


class SMTPEmailAdapter(EmailAdapter):
    """SMTP email adapter backed by Gmail SMTP."""

    def __init__(self) -> None:
        self.gmail_user = os.getenv("GMAIL_USER")
        self.gmail_pass = os.getenv("GMAIL_PASS")

    async def send_email(self, to_email: str, subject: str, html_body: str) -> dict:
        if not self.gmail_user or not self.gmail_pass:
            error = "Missing Gmail credentials: GMAIL_USER and GMAIL_PASS are required"
            logger.error(error)
            return {"success": False, "error": error}

        message = EmailMessage()
        message["From"] = self.gmail_user
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content("This email requires an HTML-capable client.")
        message.add_alternative(html_body, subtype="html")

        try:
            await send(
                message,
                hostname="smtp.gmail.com",
                port=587,
                start_tls=True,
                username=self.gmail_user,
                password=self.gmail_pass,
            )
            return {"success": True}
        except SMTPException as exc:
            logger.exception("SMTP error sending email to %s", to_email)
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            logger.exception("Unexpected SMTP error sending email to %s", to_email)
            return {"success": False, "error": str(exc)}
