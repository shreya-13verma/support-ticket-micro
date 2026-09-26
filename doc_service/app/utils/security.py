from typing import Optional, Dict, Any
from jose import jwt, JWTError
from fastapi import Header, HTTPException, status
from app.config import settings


def decode_access_token_locally(token: str) -> Optional[Dict[str, Any]]:
    """Fast local decode of JWT using shared SECRET_KEY and HS256."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


async def verify_internal_api_key(x_internal_api_key: Optional[str] = Header(None)) -> str:
    """Ensure inter-service calls provide the correct internal API key."""
    if not x_internal_api_key or x_internal_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or missing internal service API key"
        )
    return x_internal_api_key
