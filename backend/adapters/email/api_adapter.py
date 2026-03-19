import asyncio
import logging
import os

import resend

from backend.adapters.email.adapter_interface import EmailAdapter

logger = logging.getLogger(__name__)

_BATCH_SIZE = 100


class ResendEmailAdapter(EmailAdapter):
    """Email adapter backed by the Resend API."""

    def __init__(self) -> None:
        resend.api_key = os.getenv("RESEND_API_KEY")
        self.default_from = os.getenv("RESEND_FROM")

    def _check_config(self) -> str | None:
        if not resend.api_key:
            return "Missing RESEND_API_KEY"
        if not self.default_from:
            return "Missing RESEND_FROM"
        return None

    async def send_email(self, to_email: str, subject: str, html_body: str) -> dict:
        if error := self._check_config():
            logger.error(error)
            return {"success": False, "error": error}

        params: resend.Emails.SendParams = {
            "from": self.default_from,
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }

        try:
            await asyncio.to_thread(resend.Emails.send, params)
            return {"success": True}
        except Exception:
            logger.exception("Resend error sending email to %s", to_email)
            return {"success": False, "error": "Resend API error"}

    async def send_batch(self, emails: list[dict]) -> dict:
        """Send emails in chunks of 100 using the Resend batch API."""
        if error := self._check_config():
            logger.error(error)
            return {"sent_count": 0, "failed_count": len(emails), "error": error}

        sent_count = 0
        failed_count = 0

        for i in range(0, len(emails), _BATCH_SIZE):
            chunk = emails[i : i + _BATCH_SIZE]
            params: list[resend.Emails.SendParams] = [
                {
                    "from": self.default_from,
                    "to": [e["to_email"]],
                    "subject": e["subject"],
                    "html": e["html_body"],
                }
                for e in chunk
            ]
            try:
                await asyncio.to_thread(resend.Batch.send, params)
                sent_count += len(chunk)
                logger.info("Batch sent %d emails (chunk %d)", len(chunk), i // _BATCH_SIZE + 1)
            except Exception:
                logger.exception("Resend batch error for chunk starting at index %d", i)
                failed_count += len(chunk)

        return {"sent_count": sent_count, "failed_count": failed_count}
