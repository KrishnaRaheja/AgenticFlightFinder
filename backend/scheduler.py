"""
Scheduler module for autonomous flight monitoring.

This module manages periodic flight preference monitoring using APScheduler,
ensuring that active user preferences are checked on a regular schedule.
"""

import asyncio
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from pytz import timezone

from backend.email_service import send_daily_alert_emails
from backend.services import MonitoringService

# Configure logging for scheduler events
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
monitoring_service = MonitoringService()


async def monitor_all_active_preferences():
    """
    Monitor all active flight preferences by querying the database and calling Claude.
    
    This function retrieves all active preferences from the flight_preferences table
    and processes each one through Claude for monitoring. It handles errors gracefully,
    continuing to the next preference if one fails.
    
    Returns:
        int: Number of preferences successfully processed
    """
    return await monitoring_service.monitor_all_active_preferences()


def run_monitoring_job():
    """
    Wrapper function to execute the async monitoring job.
    
    NOTE: This wrapper exists because APScheduler expects synchronous functions,
    but monitor_all_active_preferences is async. This bridges the gap by using
    asyncio.run() to properly execute the async function.
    
    This function runs the async monitor_all_active_preferences function using
    asyncio.run() and includes error handling for any unexpected issues.
    """
    try:
        logger.info("Starting monitoring job execution")
        result = asyncio.run(monitor_all_active_preferences())
        logger.info(f"Monitoring job completed successfully with result: {result}")
    except Exception as e:
        logger.error(f"Error executing monitoring job: {str(e)}", exc_info=True)


def run_email_job():
    """
    Execute the email delivery job.
    
    Sends queued email notifications to users by calling the email service.
    Logs the number of emails sent and any failures.
    """
    try:
        logger.info("Starting email delivery job")
        result = asyncio.run(send_daily_alert_emails())
        
        sent_count = result.get("sent_count", 0)
        failed_count = result.get("failed_count", 0)
        
        logger.info(f"Email delivery completed: {sent_count} sent, {failed_count} failed")
        
        if failed_count > 0:
            logger.warning(f"Email delivery job had {failed_count} failures")
    except Exception as e:
        logger.error(f"Error executing email job: {str(e)}", exc_info=True)


def start_scheduler():
    """
    Initialize and start the background scheduler for autonomous flight monitoring.
    
    Sets up scheduled jobs:
    - Morning monitoring: 7:00 AM EST (12:00 UTC)
    - Afternoon monitoring: 3:00 PM EST (20:00 UTC)
    - Email delivery: 8:00 PM EST (01:00 UTC next day)
    
    Returns:
        BackgroundScheduler: The initialized scheduler instance
    """
    # Initialize scheduler with UTC timezone
    scheduler = BackgroundScheduler(timezone=timezone('UTC'))
    
    # Add morning monitoring job (7am EST = 12:00 UTC)
    scheduler.add_job(
        run_monitoring_job,
        'cron',
        hour=12,
        minute=0,
        id='morning_monitoring',
        name='Morning Flight Monitoring (7am EST)',
        replace_existing=True
    )
    logger.info("Added morning monitoring job (7am EST / 12:00 UTC)")
    
    # Add afternoon monitoring job (3pm EST = 20:00 UTC)
    scheduler.add_job(
        run_monitoring_job,
        'cron',
        hour=20,
        minute=0,
        id='afternoon_monitoring',
        name='Afternoon Flight Monitoring (3pm EST)',
        replace_existing=True
    )
    logger.info("Added afternoon monitoring job (3pm EST / 20:00 UTC)")
    
    # Add email delivery job (8pm EST = 01:00 UTC next day)
    scheduler.add_job(
        run_email_job,
        'cron',
        hour=1,
        minute=0,
        id='email_delivery',
        name='Email Delivery (8pm EST)',
        replace_existing=True
    )
    logger.info("Added email delivery job (8pm EST / 01:00 UTC)")
    
    # Start the scheduler
    scheduler.start()
    logger.info("Background scheduler started successfully")
    
    return scheduler
