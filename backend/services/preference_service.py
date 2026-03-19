import logging
import uuid
from datetime import datetime, timezone
from typing import Callable
from uuid import UUID

from backend.database import get_supabase
from backend.limits import MAX_ACTIVE_PREFERENCES_PER_USER
from backend.schemas import FlightPreferenceCreate, FlightPreferenceStatusUpdate
from backend.services.exceptions import PreferenceNotFoundError, PreferenceServiceError

logger = logging.getLogger(__name__)


class PreferenceService:
    def __init__(
        self,
        supabase_factory: Callable = get_supabase,
    ):
        self._supabase_factory = supabase_factory

    def _supabase(self):
        return self._supabase_factory()

    def _get_existing_preference(self, preference_id: UUID | str, user_id: str) -> dict:
        response = (
            self._supabase()
            .table("flight_preferences")
            .select("*")
            .eq("id", str(preference_id))
            .eq("user_id", user_id)
            .execute()
        )

        if not response.data:
            raise PreferenceNotFoundError("Preference not found")

        return response.data[0]

    def _count_active_preferences(self, user_id: str) -> int:
        response = (
            self._supabase()
            .table("flight_preferences")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )
        return response.count or 0

    async def create_preference(
        self,
        preference: FlightPreferenceCreate,
        user_id: str,
    ) -> dict:
        try:
            active_count = self._count_active_preferences(user_id)
            if active_count >= MAX_ACTIVE_PREFERENCES_PER_USER:
                raise PreferenceServiceError(
                    f"Active tracker limit reached ({MAX_ACTIVE_PREFERENCES_PER_USER}). "
                    "Pause an existing tracker to add a new one."
                )

            current_timestamp = datetime.now(timezone.utc).isoformat()
            preference_dict = preference.model_dump()
            preference_dict.update(
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "is_active": True,
                    "created_at": current_timestamp,
                    "updated_at": current_timestamp,
                }
            )

            response = self._supabase().table("flight_preferences").insert(preference_dict).execute()
            created_preference = response.data[0]

            return created_preference
        except PreferenceServiceError:
            raise
        except Exception as exc:
            raise PreferenceServiceError(f"Failed to create preference: {str(exc)}") from exc

    def get_preferences(self, user_id: str) -> list[dict]:
        try:
            response = (
                self._supabase()
                .table("flight_preferences")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            return response.data or []
        except Exception as exc:
            raise PreferenceServiceError(f"Failed to retrieve preferences: {str(exc)}") from exc

    def get_preference(self, preference_id: UUID, user_id: str) -> dict:
        try:
            return self._get_existing_preference(preference_id, user_id)
        except PreferenceNotFoundError:
            raise
        except Exception as exc:
            raise PreferenceServiceError(f"Failed to retrieve preference: {str(exc)}") from exc

    def update_preference(
        self,
        preference_id: UUID,
        preference: FlightPreferenceCreate,
        user_id: str,
    ) -> dict:
        try:
            self._get_existing_preference(preference_id, user_id)

            update_dict = preference.model_dump()
            update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

            response = (
                self._supabase()
                .table("flight_preferences")
                .update(update_dict)
                .eq("id", str(preference_id))
                .eq("user_id", user_id)
                .execute()
            )
            return response.data[0]
        except PreferenceNotFoundError:
            raise
        except Exception as exc:
            raise PreferenceServiceError(f"Failed to update preference: {str(exc)}") from exc

    def update_preference_status(
        self,
        preference_id: UUID,
        status_update: FlightPreferenceStatusUpdate,
        user_id: str,
    ) -> dict:
        try:
            self._get_existing_preference(preference_id, user_id)

            if status_update.is_active:
                active_count = self._count_active_preferences(user_id)
                if active_count >= MAX_ACTIVE_PREFERENCES_PER_USER:
                    raise PreferenceServiceError(
                        f"Active tracker limit reached ({MAX_ACTIVE_PREFERENCES_PER_USER}). "
                        "Pause an existing tracker to resume this one."
                    )

            response = (
                self._supabase()
                .table("flight_preferences")
                .update(
                    {
                        "is_active": status_update.is_active,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                .eq("id", str(preference_id))
                .eq("user_id", user_id)
                .execute()
            )
            return response.data[0]
        except PreferenceNotFoundError:
            raise
        except Exception as exc:
            raise PreferenceServiceError(
                f"Failed to update preference status: {str(exc)}"
            ) from exc

    def delete_preference(self, preference_id: UUID, user_id: str) -> dict:
        try:
            self._get_existing_preference(preference_id, user_id)

            self._supabase().table("flight_preferences").update(
                {
                    "is_active": False,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("id", str(preference_id)).eq("user_id", user_id).execute()

            return {
                "message": "Preference deactivated successfully",
                "id": str(preference_id),
            }
        except PreferenceNotFoundError:
            raise
        except Exception as exc:
            raise PreferenceServiceError(f"Failed to delete preference: {str(exc)}") from exc

    def get_preference_alerts(self, preference_id: UUID, user_id: str) -> list[dict]:
        try:
            self._get_existing_preference(preference_id, user_id)

            response = (
                self._supabase()
                .table("alerts_sent")
                .select(
                    "id,email_subject,email_body_html,sent_at,reasoning,reference_price,alert_type"
                )
                .eq("preference_id", str(preference_id))
                .order("sent_at", desc=True)
                .execute()
            )
            return response.data or []
        except PreferenceNotFoundError:
            raise
        except Exception as exc:
            raise PreferenceServiceError(f"Failed to retrieve alerts: {str(exc)}") from exc