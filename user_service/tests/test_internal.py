import pytest
from httpx import AsyncClient
from app.config import settings


@pytest.mark.asyncio
async def test_internal_routes_and_security(client: AsyncClient):
    # Register an agent
    agent_res = await client.post("/api/v1/auth/register", json={
        "email": "agent007@example.com",
        "name": "Agent Bond",
        "password": "agentpassword123",
        "role": "agent"
    })
    agent_id = agent_res.json()["id"]

    # Login to get JWT
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "agent007@example.com",
        "password": "agentpassword123"
    })
    token = login_res.json()["access_token"]

    # TC-006: Internal route accessed without API key returns 403
    unauth_req = await client.get(f"/internal/users/{agent_id}")
    assert unauth_req.status_code == 403

    unauth_verify = await client.post(
        "/internal/verify-token",
        json={"token": token}
    )
    assert unauth_verify.status_code == 403

    # With valid X-Internal-API-Key header
    headers = {"X-Internal-API-Key": settings.INTERNAL_API_KEY}

    valid_user_res = await client.get(f"/internal/users/{agent_id}", headers=headers)
    assert valid_user_res.status_code == 200
    assert valid_user_res.json()["email"] == "agent007@example.com"

    verify_res = await client.post(
        "/internal/verify-token",
        json={"token": token},
        headers=headers
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] is True
    assert verify_res.json()["user_id"] == agent_id
    assert verify_res.json()["role"] == "agent"

    # Non-existent user query returns 404
    not_found = await client.get("/internal/users/99999", headers=headers)
    assert not_found.status_code == 404
