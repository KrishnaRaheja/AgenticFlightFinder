"""
Scheduler module for autonomous flight monitoring.

This module manages periodic flight preference monitoring using APScheduler,
ensuring that active user preferences are checked on a regular schedule.
"""

import asyncio
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from pytz import timezone

from backend.claude_service import call_claude_for_monitoring
from backend.database import get_supabase

# Configure logging for scheduler events
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def monitor_all_active_preferences():
    """
    Monitor all active flight preferences by querying the database and calling Claude.
    
    This function retrieves all active preferences from the flight_preferences table
    and processes each one through Claude for monitoring. It handles errors gracefully,
    continuing to the next preference if one fails.
    
    Returns:
        int: Number of preferences successfully processed
    """
    try:
        supabase = get_supabase()
        
        # Query for all active preferences
        response = supabase.table('flight_preferences').select('*').eq('is_active', True).execute()
        active_preferences = response.data
        
        logger.info(f"Found {len(active_preferences)} active preferences to monitor")
        
        processed_count = 0
        for preference in active_preferences:
            try:
                user_id = preference['user_id']
                preference_id = preference['id']
                
                # Call Claude for monitoring this preference
                await call_claude_for_monitoring(user_id, preference_id)
                processed_count += 1
                logger.debug(f"Successfully monitored preference {preference_id} for user {user_id}")
                
            except Exception as e:
                logger.error(
                    f"Error monitoring preference {preference.get('id')} "
                    f"for user {preference.get('user_id')}: {str(e)}",
                    exc_info=True
                )
                # Continue to next preference if one fails
                continue
        
        logger.info(f"Monitoring job completed. Processed {processed_count}/{len(active_preferences)} preferences")
        return processed_count
        
    except Exception as e:
        logger.error(f"Error in monitor_all_active_preferences: {str(e)}", exc_info=True)
        return 0


def run_monitoring_job():
    """
    Wrapper function to execute the async monitoring job.
    
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
    
    Sends queued email notifications to users. This is a placeholder
    that logs when the email job would run.
    """
    try:
        logger.info("Email delivery job would run here")
        # TODO: Implement email delivery logic
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
