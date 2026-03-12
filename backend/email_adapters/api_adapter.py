import logging
import os

import httpx

from backend.email_adapters.adapter_interface import EmailAdapter

logger = logging.getLogger(__name__)


class APIEmailAdapter(EmailAdapter):
    """Generic API-based email adapter.

    Expected API contract:
    - Method: POST
    - URL: EMAIL_API_URL
    - Headers: Authorization bearer token if EMAIL_API_KEY is set
    - JSON body: {"from": ..., "to": ..., "subject": ..., "html": ...}
    """

    def __init__(self) -> None:
        self.api_url = os.getenv("EMAIL_API_URL")
        self.api_key = os.getenv("EMAIL_API_KEY")
        self.default_from = os.getenv("EMAIL_API_FROM")
        self.timeout_seconds = float(os.getenv("EMAIL_API_TIMEOUT", "30"))

    async def send_email(self, to_email: str, subject: str, html_body: str) -> dict:
        if not self.api_url:
            error = "Missing EMAIL_API_URL for API email provider"
            logger.error(error)
            return {"success": False, "error": error}

        payload = {
            "from": self.default_from,
            "to": to_email,
            "subject": subject,
            "html": html_body,
        }
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(self.api_url, json=payload, headers=headers)
                response.raise_for_status()
            return {"success": True}
        except httpx.HTTPStatusError as exc:
            logger.exception("API email HTTP error for %s", to_email)
            return {
                "success": False,
                "error": f"HTTP {exc.response.status_code}: {exc.response.text}",
            }
        except Exception as exc:
            logger.exception("Unexpected API email error for %s", to_email)
            return {"success": False, "error": str(exc)}
