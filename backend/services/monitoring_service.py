import asyncio
import logging
import random
from typing import Callable

from backend.claude_service import call_claude_for_monitoring
from backend.database import get_supabase

logger = logging.getLogger(__name__)


class MonitoringService:
    """Service for managing flight preference monitoring and Claude-based analysis.
    
    Handles triggering Claude to monitor active flight preferences, including
    immediate monitoring on preference creation and scheduled daily monitoring.
    """

    def __init__(
        self,
        supabase_factory: Callable = get_supabase,
        monitor_func: Callable = call_claude_for_monitoring,
    ):
        """Initialize the MonitoringService with dependencies.
        
        Args:
            supabase_factory: Callable that returns a Supabase client instance.
                Defaults to get_supabase.
            monitor_func: Callable that triggers Claude monitoring for a preference.
                Defaults to call_claude_for_monitoring.
        """
        self._supabase_factory = supabase_factory
        self._monitor_func = monitor_func

    async def monitor_preference(self, user_id: str, preference_id: str) -> None:
        """Monitor a single flight preference by calling Claude.
        
        Args:
            user_id: The ID of the user who owns the preference.
            preference_id: The ID of the flight preference to monitor.
        
        Raises:
            Exception: Any exception raised by the monitoring function is propagated.
        """
        await self._monitor_func(user_id, preference_id)

    async def run_immediate_monitoring(self, user_id: str, preference_id: str) -> None:
        """Run immediate monitoring for a preference with error handling.
        
        Wraps monitor_preference() with try-except to capture and log errors
        without propagating exceptions. Used for non-blocking monitoring tasks.
        
        Args:
            user_id: The ID of the user who owns the preference.
            preference_id: The ID of the flight preference to monitor.
        """
        try:
            await self.monitor_preference(user_id, preference_id)
            logger.info(
                "Immediate monitoring succeeded for user %s preference %s",
                user_id,
                preference_id,
            )
        except Exception as exc:
            logger.error(
                "Immediate monitoring failed for user %s preference %s: %s",
                user_id,
                preference_id,
                str(exc),
                exc_info=True,
            )

    def trigger_immediate_monitoring(self, user_id: str, preference_id: str) -> None:
        """Trigger immediate monitoring asynchronously without blocking.
        
        Schedules run_immediate_monitoring() as a background task via asyncio.
        Called when a new preference is created to perform initial monitoring.
        
        Args:
            user_id: The ID of the user who owns the preference.
            preference_id: The ID of the newly created preference.
        """
        asyncio.create_task(self.run_immediate_monitoring(user_id, preference_id))

    async def monitor_all_active_preferences(self) -> int:
        """Monitor all active flight preferences in the database.
        
        Retrieves all preferences marked as active and runs monitoring for each via Claude.
        Handles individual preference errors gracefully, continuing with remaining preferences.
        Called by the scheduled daily monitoring job.
        
        Returns:
            The number of preferences successfully processed. Returns 0 if a database
            error occurs.
        """
        try:
            supabase = self._supabase_factory()
            response = (
                supabase.table("flight_preferences")
                .select("*")
                .eq("is_active", True)
                .execute()
            )
            active_preferences = response.data or []

            logger.info("Found %s active preferences to monitor", len(active_preferences))

            processed_count = 0
            for preference in active_preferences:
                await asyncio.sleep(random.uniform(2, 5))
                try:
                    await self.monitor_preference(preference["user_id"], preference["id"])
                    processed_count += 1
                    logger.debug(
                        "Successfully monitored preference %s for user %s",
                        preference["id"],
                        preference["user_id"],
                    )
                except Exception as exc:
                    logger.error(
                        "Error monitoring preference %s for user %s: %s",
                        preference.get("id"),
                        preference.get("user_id"),
                        str(exc),
                        exc_info=True,
                    )

            logger.info(
                "Monitoring job completed. Processed %s/%s preferences",
                processed_count,
                len(active_preferences),
            )
            return processed_count
        except Exception as exc:
            logger.error("Error in monitor_all_active_preferences: %s", str(exc), exc_info=True)
            return 0