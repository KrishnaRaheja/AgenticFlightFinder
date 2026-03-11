class PreferenceServiceError(Exception):
    """Base exception for preference service failures."""


class PreferenceNotFoundError(PreferenceServiceError):
    """Raised when a preference cannot be found for a user."""