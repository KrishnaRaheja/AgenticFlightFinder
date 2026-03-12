import asyncio
import logging
from functools import lru_cache
from datetime import datetime
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

from backend.database import get_supabase
from backend.email_adapters import get_email_adapter

load_dotenv()

logger = logging.getLogger(__name__)

# When this is redeployed to Railway, this python process will restart and check .env
# This gets the email adapter instance and caches it for the entire deployment lifetime, so we dont have to again
@lru_cache(maxsize=1)
def _resolve_email_adapter():
    return get_email_adapter()


async def send_email(to_email: str, subject: str, html_body: str) -> dict:
    try:
        adapter = _resolve_email_adapter()
        return await adapter.send_email(to_email, subject, html_body)
    except ValueError:
        logger.exception("Email provider configuration error")
        return {"success": False, "error": "Email provider configuration error"}
    except Exception:
        logger.exception("Unexpected error sending email to %s", to_email)
        return {"success": False, "error": "Unexpected email sending error"}


async def send_email_via_smtp(to_email: str, subject: str, html_body: str) -> dict:
    """Backward-compatible wrapper; now routes via configured email adapter."""
    return await send_email(to_email, subject, html_body)


async def send_daily_alert_emails() -> dict:
    """Send all alerts created today to their respective users. Applies across all frequency types."""
    supabase = get_supabase()
    PT = ZoneInfo('America/Los_Angeles')
    today_start = datetime.now(PT).replace(hour=0, minute=0, second=0, microsecond=0)

    sent_count = 0
    failed_count = 0

    try:
        response = (
            supabase.table("alerts_sent")
            .select("id,user_id,email_subject,email_body_html,reasoning,sent_at")
            .gte("sent_at", today_start.isoformat())
            .execute()
        )
        alerts = response.data or []
    except Exception as exc:
        logger.exception("Failed to query alerts_sent")
        return {"sent_count": 0, "failed_count": 0, "error": str(exc)}

    for alert in alerts:
        alert_id = alert.get("id")
        user_id = alert.get("user_id")
        subject = alert.get("email_subject")
        html_body = alert.get("email_body_html")
        if not subject or not html_body:
            logger.error("Missing email_subject or email_body_html for alert %s", alert_id)
            failed_count += 1
            continue

        try:
            user_response = supabase.auth.admin.get_user_by_id(user_id)
            to_email = user_response.user.email if user_response and user_response.user else None
        except Exception:
            logger.exception("Failed to fetch user email for alert %s", alert_id)
            failed_count += 1
            continue

        if not to_email:
            logger.error("Missing email for alert %s", alert_id)
            failed_count += 1
            continue

        # Send using configured email provider adapter.
        result = await send_email(to_email, subject, html_body)
        if result.get("success"):
            logger.info("Sent alert email for alert %s", alert_id)
            sent_count += 1
        else:
            logger.error("Failed to send alert email for alert %s: %s", alert_id, result.get("error"))
            failed_count += 1

    return {"sent_count": sent_count, "failed_count": failed_count}


if __name__ == "__main__":
    results = asyncio.run(send_daily_alert_emails())
    print(results)
