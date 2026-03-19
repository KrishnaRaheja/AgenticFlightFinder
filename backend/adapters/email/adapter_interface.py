from abc import ABC, abstractmethod


class EmailAdapter(ABC):
    """Abstract email provider interface."""

    @abstractmethod
    async def send_email(self, to_email: str, subject: str, html_body: str) -> dict:
        """Send a single email. Returns {"success": True} or {"success": False, "error": ...}."""
        raise NotImplementedError

    async def send_batch(self, emails: list[dict]) -> dict:
        """Send multiple emails. Each dict must have: to_email, subject, html_body.

        Default implementation loops over send_email — adapters can override with
        a native batch API for better performance.

        Returns {"sent_count": N, "failed_count": M}.
        """
        sent_count = 0
        failed_count = 0
        for email in emails:
            result = await self.send_email(
                email["to_email"], email["subject"], email["html_body"]
            )
            if result.get("success"):
                sent_count += 1
            else:
                failed_count += 1
        return {"sent_count": sent_count, "failed_count": failed_count}
