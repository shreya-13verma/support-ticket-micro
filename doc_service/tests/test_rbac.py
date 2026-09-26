import pytest
from httpx import AsyncClient
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.config import settings


@pytest.mark.asyncio
async def test_jwt_verification_and_expiry(client: AsyncClient, admin_headers):
    """TC-002: Valid JWT parsed; expired or invalid token rejected with 401."""
    # 1. Expired token
    expired_payload = {
        "sub": "3",
        "email": "admin@example.com",
        "role": "Admin",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=10)
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    resp_expired = await client.post(
        "/api/v1/categories",
        json={"name": "Expired Test"},
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert resp_expired.status_code == 401

    # 2. Tampered / wrong secret token
    tampered_token = jwt.encode(
        {"sub": "3", "role": "Admin", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        "wrong_secret_key_12345",
        algorithm="HS256"
    )
    resp_tampered = await client.post(
        "/api/v1/categories",
        json={"name": "Tampered Test"},
        headers={"Authorization": f"Bearer {tampered_token}"}
    )
    assert resp_tampered.status_code == 401


@pytest.mark.asyncio
async def test_rbac_matrix_on_article_creation(client: AsyncClient, user_headers, agent_headers, admin_headers):
    """Users cannot create articles (403), Agents and Admins can create articles."""
    cat_resp = await client.post("/api/v1/categories", json={"name": "Auth Matrix"}, headers=admin_headers)
    cat_id = cat_resp.json()["id"]

    # User attempt
    user_create = await client.post(
        "/api/v1/docs",
        json={"title": "User Article", "content": "Forbidden", "category_id": cat_id},
        headers=user_headers
    )
    assert user_create.status_code == 403

    # Agent attempt
    agent_create = await client.post(
        "/api/v1/docs",
        json={"title": "Agent Article", "content": "Allowed", "category_id": cat_id},
        headers=agent_headers
    )
    assert agent_create.status_code == 201

    # Admin attempt
    admin_create = await client.post(
        "/api/v1/docs",
        json={"title": "Admin Article", "content": "Allowed", "category_id": cat_id, "status": "published"},
        headers=admin_headers
    )
    assert admin_create.status_code == 201
