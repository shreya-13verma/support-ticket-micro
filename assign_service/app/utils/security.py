from typing import Optional, Any
from jose import jwt, JWTError
from app.config import settings


def decode_access_token_locally(token: str) -> Optional[dict[str, Any]]:
    """Decode and validate a JWT access token using shared secret key."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
