import asyncio
import logging
from typing import Callable

from backend.claude_service import call_claude_for_monitoring
from backend.database import get_supabase

logger = logging.getLogger(__name__)


class MonitoringService:
    def __init__(
        self,
        supabase_factory: Callable = get_supabase,
        monitor_func: Callable = call_claude_for_monitoring,
    ):
        self._supabase_factory = supabase_factory
        self._monitor_func = monitor_func

    async def monitor_preference(self, user_id: str, preference_id: str) -> None:
        await self._monitor_func(user_id, preference_id)

    async def run_immediate_monitoring(self, user_id: str, preference_id: str) -> None:
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
        asyncio.create_task(self.run_immediate_monitoring(user_id, preference_id))

    async def monitor_all_active_preferences(self) -> int:
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