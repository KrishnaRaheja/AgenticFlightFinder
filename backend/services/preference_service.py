"""Service layer for managing flight preference CRUD operations and validation.

Handles creation, retrieval, update, and deletion of flight preferences with
business rule enforcement such as active preference limits and reactivation validation.
"""
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
    """Service for managing flight preferences with database operations.
    
    Enforces business rules including active preference limits and validates
    preference state transitions. Accepts a supabase_factory for dependency
    injection, allowing for different client configurations (user-scoped vs service-role).
    """
    def __init__(
        self,
        supabase_factory: Callable = get_supabase,
    ):
        """Initialize the preference service.
        
        Args:
            supabase_factory: Callable that returns a Supabase client instance.
                Defaults to get_supabase() for service-role access.
        """
        self._supabase_factory = supabase_factory

    def _supabase(self):
        """Get a Supabase client instance.
        
        Returns:
            A Supabase client configured by the factory.
        """
        return self._supabase_factory()

    def _get_existing_preference(self, preference_id: UUID | str, user_id: str) -> dict:
        """Retrieve a preference and verify ownership by the user.
        
        Args:
            preference_id: The preference ID to retrieve.
            user_id: The user ID to verify ownership.
            
        Returns:
            The preference record as a dictionary.
            
        Raises:
            PreferenceNotFoundError: If the preference does not exist or is not owned by the user.
        """
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
        """Count the number of active preferences for a user.
        
        Args:
            user_id: The user ID to count active preferences for.
            
        Returns:
            The count of active preferences.
        """
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
        """Create a new flight preference for a user.
        
        Args:
            preference: The preference data to create.
            user_id: The user ID for the preference.
            
        Returns:
            The created preference record as a dictionary.
            
        Raises:
            PreferenceServiceError: If the active preference limit is exceeded or creation fails.
        """
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
        """Retrieve all preferences for a user, ordered by creation date.
        
        Args:
            user_id: The user ID to retrieve preferences for.
            
        Returns:
            A list of preference records, ordered by created_at descending.
            
        Raises:
            PreferenceServiceError: If retrieval fails.
        """
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
        """Retrieve a specific preference by ID, verifying user ownership.
        
        Args:
            preference_id: The preference ID to retrieve.
            user_id: The user ID to verify ownership.
            
        Returns:
            The preference record as a dictionary.
            
        Raises:
            PreferenceNotFoundError: If the preference does not exist or is not owned by the user.
            PreferenceServiceError: If retrieval fails for other reasons.
        """
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
        """Update an existing preference.
        
        Args:
            preference_id: The preference ID to update.
            preference: The new preference data.
            user_id: The user ID to verify ownership.
            
        Returns:
            The updated preference record as a dictionary.
            
        Raises:
            PreferenceNotFoundError: If the preference does not exist or is not owned by the user.
            PreferenceServiceError: If update fails.
        """
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
        """Update the active/inactive status of a preference.
        
        When reactivating, enforces the active preference limit. Updates the updated_at
        timestamp automatically.
        
        Args:
            preference_id: The preference ID to update.
            status_update: The status update data (is_active flag).
            user_id: The user ID to verify ownership.
            
        Returns:
            The updated preference record as a dictionary.
            
        Raises:
            PreferenceNotFoundError: If the preference does not exist or is not owned by the user.
            PreferenceServiceError: If the active preference limit would be exceeded or update fails.
        """
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
        """Deactivate a preference (soft delete).
        
        Marks the preference as inactive rather than removing it from the database,
        preserving historical data and audit trails.
        
        Args:
            preference_id: The preference ID to delete.
            user_id: The user ID to verify ownership.
            
        Returns:
            A dictionary with a success message and the preference ID.
            
        Raises:
            PreferenceNotFoundError: If the preference does not exist or is not owned by the user.
            PreferenceServiceError: If deletion fails.
        """
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
        """Retrieve all alerts sent for a specific preference.
        
        Args:
            preference_id: The preference ID to retrieve alerts for.
            user_id: The user ID to verify preference ownership.
            
        Returns:
            A list of alert records ordered by sent_at descending.
            
        Raises:
            PreferenceNotFoundError: If the preference does not exist or is not owned by the user.
            PreferenceServiceError: If retrieval fails.
        """
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