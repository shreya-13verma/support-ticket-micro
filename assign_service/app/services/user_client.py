import httpx
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from app.config import settings

logger = logging.getLogger(__name__)


class UserServiceClient:
    def __init__(self, base_url: str = settings.USER_SERVICE_URL, api_key: str = settings.INTERNAL_API_KEY):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.headers = {"X-Internal-API-Key": self.api_key}

    async def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Fetch user by ID from user_service. Raises 503 if user_service is unreachable."""
        url = f"{self.base_url}/internal/users/{user_id}"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(url, headers=self.headers)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    return None
                elif response.status_code == 403:
                    logger.error("Internal API key rejected by user_service")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Inter-service authentication configuration error"
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=f"User service returned error: {response.status_code}"
                    )
        except (httpx.RequestError, httpx.TimeoutException) as exc:
            logger.error(f"Failed to reach user_service at {url}: {exc}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="User service is currently unavailable"
            )

    async def verify_token_remote(self, token: str) -> Optional[Dict[str, Any]]:
        """Fallback remote token verification via user_service."""
        url = f"{self.base_url}/internal/verify-token"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.post(url, json={"token": token}, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("valid"):
                        return data
                return None
        except (httpx.RequestError, httpx.TimeoutException) as exc:
            logger.error(f"Failed to reach user_service for token verification: {exc}")
            return None


user_client = UserServiceClient()
