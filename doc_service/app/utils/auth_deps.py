from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, List, Optional
from app.utils.security import decode_access_token_locally
import httpx
from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


async def get_optional_user_claims(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[Dict[str, Any]]:
    """Extract user claims if Bearer token is provided, else None."""
    if not auth or not auth.credentials:
        return None
    token = auth.credentials
    payload = decode_access_token_locally(token)
    if payload:
        user_id_raw = payload.get("sub")
        if user_id_raw:
            try:
                user_id = int(user_id_raw)
                return {
                    "id": user_id,
                    "email": payload.get("email"),
                    "role": payload.get("role", "User")
                }
            except (ValueError, TypeError):
                pass
    return None


async def get_current_user_claims(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Dict[str, Any]:
    """Require valid Bearer token and extract user claims."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not auth or not auth.credentials:
        raise credentials_exception

    token = auth.credentials
    # 1. Local decode
    payload = decode_access_token_locally(token)
    if payload:
        user_id_raw = payload.get("sub")
        if user_id_raw:
            try:
                user_id = int(user_id_raw)
                return {
                    "id": user_id,
                    "email": payload.get("email"),
                    "role": payload.get("role", "User")
                }
            except (ValueError, TypeError):
                pass

    # 2. Remote fallback to user_service if needed
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(
                f"{settings.USER_SERVICE_URL}/internal/verify-token",
                json={"token": token},
                headers={"X-Internal-API-Key": settings.INTERNAL_API_KEY}
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("valid"):
                    return {
                        "id": int(data["user_id"]),
                        "email": data.get("email"),
                        "role": data.get("role", "User")
                    }
    except Exception:
        pass

    raise credentials_exception


def require_role(roles: List[str]):
    """Enforce endpoint access by role (e.g. ['Admin'], ['Agent', 'Admin'])."""
    async def role_checker(claims: Dict[str, Any] = Depends(get_current_user_claims)) -> Dict[str, Any]:
        user_role = claims.get("role", "User")
        # normalize case comparison if needed
        allowed_roles = [r.lower() for r in roles]
        if user_role.lower() not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{user_role}'"
            )
        return claims
    return role_checker
