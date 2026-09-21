import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient):
    # TC-001: Valid user registration
    reg_payload = {
        "email": "alice@example.com",
        "name": "Alice User",
        "password": "securepassword123",
        "role": "user"
    }
    response = await client.post("/api/v1/auth/register", json=reg_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "alice@example.com"
    assert data["role"] == "user"
    assert "id" in data

    # TC-002: Duplicate registration returns 409
    dup_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 409

    # TC-003: Valid login returns JWT token
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "alice@example.com",
        "password": "securepassword123"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"
    token = login_data["access_token"]

    # Refresh token endpoint
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()


@pytest.mark.asyncio
async def test_invalid_login(client: AsyncClient):
    # TC-004: Invalid password returns 401
    await client.post("/api/v1/auth/register", json={
        "email": "bob@example.com",
        "name": "Bob Agent",
        "password": "correctpassword",
        "role": "agent"
    })

    bad_login = await client.post("/api/v1/auth/login", json={
        "email": "bob@example.com",
        "password": "wrongpassword"
    })
    assert bad_login.status_code == 401
