import pytest
from httpx import AsyncClient
from conftest import make_token


@pytest.mark.asyncio
async def test_ticket_creation_and_visibility(client: AsyncClient):
    user_token = make_token(user_id=10, email="user@test.com", role="user")
    other_user_token = make_token(user_id=20, email="other@test.com", role="user")
    agent_token = make_token(user_id=30, email="agent@test.com", role="agent")

    # TC-008: Missing required fields returns 422
    bad_res = await client.post(
        "/api/v1/tickets/",
        json={"title": "Hi"},  # Missing description, category, priority
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert bad_res.status_code == 422

    # TC-007: Valid ticket creation returns 201
    create_res = await client.post(
        "/api/v1/tickets/",
        json={
            "title": "Cannot login to VPN",
            "description": "VPN connection drops after 5 seconds of connection",
            "category": "Network",
            "priority": "high"
        },
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert create_res.status_code == 201
    ticket = create_res.json()
    assert ticket["title"] == "Cannot login to VPN"
    assert ticket["status"] == "open"
    assert ticket["created_by"] == 10
    ticket_id = ticket["id"]

    # TC-009: Role-based ticket visibility
    # User 10 sees own ticket
    user_list = await client.get("/api/v1/tickets/", headers={"Authorization": f"Bearer {user_token}"})
    assert user_list.status_code == 200
    assert len(user_list.json()) == 1

    # User 20 sees 0 tickets
    other_list = await client.get("/api/v1/tickets/", headers={"Authorization": f"Bearer {other_user_token}"})
    assert other_list.status_code == 200
    assert len(other_list.json()) == 0

    # User 20 forbidden from viewing user 10's ticket directly
    forbidden_get = await client.get(f"/api/v1/tickets/{ticket_id}", headers={"Authorization": f"Bearer {other_user_token}"})
    assert forbidden_get.status_code == 403

    # Agent sees open unassigned ticket
    agent_list = await client.get("/api/v1/tickets/", headers={"Authorization": f"Bearer {agent_token}"})
    assert agent_list.status_code == 200
    assert len(agent_list.json()) == 1
