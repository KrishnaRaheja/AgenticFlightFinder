import asyncio
import logging
from functools import lru_cache
from datetime import datetime
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

from backend.database import get_supabase
from backend.adapters.email import get_email_adapter

load_dotenv()

logger = logging.getLogger(__name__)

# Cached for the lifetime of the deployment — redeploying to Railway restarts the process.
@lru_cache(maxsize=1)
def _resolve_email_adapter():
    return get_email_adapter()


async def send_email(to_email: str, subject: str, html_body: str) -> dict:
    """Send a single email via the configured adapter. Used for immediate alerts."""
    try:
        adapter = _resolve_email_adapter()
        return await adapter.send_email(to_email, subject, html_body)
    except ValueError:
        logger.exception("Email provider configuration error")
        return {"success": False, "error": "Email provider configuration error"}
    except Exception:
        logger.exception("Unexpected error sending email to %s", to_email)
        return {"success": False, "error": "Unexpected email sending error"}


async def send_daily_alert_emails() -> dict:
    """Batch-send all alerts created today to their respective users."""
    supabase = get_supabase()
    PT = ZoneInfo("America/Los_Angeles")
    today_start = datetime.now(PT).replace(hour=0, minute=0, second=0, microsecond=0)

    try:
        response = (
            supabase.table("alerts_sent")
            .select("id,user_id,email_subject,email_body_html")
            .gte("sent_at", today_start.isoformat())
            .execute()
        )
        alerts = response.data or []
    except Exception as exc:
        logger.exception("Failed to query alerts_sent")
        return {"sent_count": 0, "failed_count": 0, "error": str(exc)}

    # Resolve each alert to a sendable email, skipping any that are invalid.
    emails = []
    failed_count = 0

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

        emails.append({"to_email": to_email, "subject": subject, "html_body": html_body})

    if not emails:
        logger.info("No emails to send today.")
        return {"sent_count": 0, "failed_count": failed_count}

    adapter = _resolve_email_adapter()
    result = await adapter.send_batch(emails)

    total_sent = result.get("sent_count", 0)
    total_failed = failed_count + result.get("failed_count", 0)
    logger.info("Daily alert emails: sent=%d, failed=%d", total_sent, total_failed)
    return {"sent_count": total_sent, "failed_count": total_failed}


if __name__ == "__main__":
    results = asyncio.run(send_daily_alert_emails())
    print(results)
