from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserOut, TokenVerifyRequest, TokenVerifyResponse
from app.services.auth_service import verify_internal_api_key
from app.utils.security import decode_access_token

router = APIRouter(prefix="/internal", tags=["Internal Service APIs"])


@router.post("/verify-token", response_model=TokenVerifyResponse)
async def verify_token_internal(
    payload: TokenVerifyRequest,
    _authorized: bool = Depends(verify_internal_api_key)
):
    decoded = decode_access_token(payload.token)
    if not decoded:
        return {"valid": False}
    user_id_raw = decoded.get("sub")
    if not user_id_raw:
        return {"valid": False}
    try:
        user_id = int(user_id_raw)
    except (ValueError, TypeError):
        return {"valid": False}
    return {
        "valid": True,
        "user_id": user_id,
        "email": decoded.get("email"),
        "role": decoded.get("role")
    }


@router.get("/users/{user_id}", response_model=UserOut)
async def get_user_internal(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _authorized: bool = Depends(verify_internal_api_key)
):
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user
