from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Dict, Any, List
from app.utils.security import decode_access_token_locally
from app.services.user_client import user_client

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8001/api/v1/auth/login")


async def get_current_user_claims(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    # 1. Fast local verification
    payload = decode_access_token_locally(token)
    if payload:
        user_id_raw = payload.get("sub")
        if user_id_raw:
            try:
                user_id = int(user_id_raw)
                return {
                    "id": user_id,
                    "email": payload.get("email"),
                    "role": payload.get("role", "user")
                }
            except (ValueError, TypeError):
                pass

    # 2. Remote fallback verification
    remote_data = await user_client.verify_token_remote(token)
    if remote_data and remote_data.get("valid"):
        return {
            "id": int(remote_data["user_id"]),
            "email": remote_data.get("email"),
            "role": remote_data.get("role", "user")
        }

    raise credentials_exception


def require_role(roles: List[str]):
    async def role_checker(claims: Dict[str, Any] = Depends(get_current_user_claims)) -> Dict[str, Any]:
        user_role = claims.get("role", "user")
        if user_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{user_role}'"
            )
        return claims
    return role_checker
