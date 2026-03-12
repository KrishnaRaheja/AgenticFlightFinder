import asyncio
import logging
import os
from datetime import datetime
from zoneinfo import ZoneInfo
from email.message import EmailMessage

from aiosmtplib import SMTPException, send
from dotenv import load_dotenv

from backend.database import get_supabase

load_dotenv()

logger = logging.getLogger(__name__)

GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASS = os.getenv("GMAIL_PASS")

if not GMAIL_USER or not GMAIL_PASS:
    raise ValueError("Missing Gmail credentials: GMAIL_USER and GMAIL_PASS are required.")


async def send_email_via_smtp(to_email: str, subject: str, html_body: str) -> dict:
    message = EmailMessage()
    message["From"] = GMAIL_USER
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
            username=GMAIL_USER,
            password=GMAIL_PASS,
        )
        return {"success": True}
    except SMTPException as exc:
        logger.exception("SMTP error sending email to %s", to_email)
        return {"success": False, "error": str(exc)}
    except Exception as exc:
        logger.exception("Unexpected error sending email to %s", to_email)
        return {"success": False, "error": str(exc)}


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
        reasoning = alert.get("reasoning") or ""

        if not subject or not html_body:
            logger.error("Missing email_subject or email_body_html for alert %s", alert_id)
            failed_count += 1
            continue

        try:
            user_response = supabase.auth.admin.get_user_by_id(user_id)
            to_email = user_response.user.email if user_response and user_response.user else None
        except Exception as exc:
            logger.exception("Failed to fetch user email for alert %s", alert_id)
            failed_count += 1
            continue

        if not to_email:
            logger.error("Missing email for alert %s", alert_id)
            failed_count += 1
            continue

        # sending the email logic done by send_email_via_smtp function
        result = await send_email_via_smtp(to_email, subject, html_body)
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
