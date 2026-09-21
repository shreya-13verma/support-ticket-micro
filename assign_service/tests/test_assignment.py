import pytest
import respx
import httpx
from httpx import AsyncClient
from conftest import make_token
from app.config import settings


@pytest.mark.asyncio
async def test_assignment_flows_and_user_service_mocking(client: AsyncClient):
    user_token = make_token(user_id=1, email="user@test.com", role="user")
    agent_token = make_token(user_id=2, email="agent@test.com", role="agent")

    # Create a ticket
    create_res = await client.post(
        "/api/v1/tickets/",
        json={
            "title": "Email server slow",
            "description": "Sending emails takes several minutes",
            "category": "Email",
            "priority": "medium"
        },
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert create_res.status_code == 201
    ticket_id = create_res.json()["id"]

    # TC-010: Ticket assignment to valid active agent with respx mock
    with respx.mock(base_url=settings.USER_SERVICE_URL, assert_all_called=False) as respx_mock:
        respx_mock.get("/internal/users/2").respond(
            200,
            json={"id": 2, "email": "agent@test.com", "name": "Agent 2", "role": "agent", "is_active": True}
        )

        assign_res = await client.put(
            f"/api/v1/tickets/{ticket_id}/assign",
            json={"agent_id": 2},
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert assign_res.status_code == 200
        assigned_ticket = assign_res.json()
        assert assigned_ticket["assigned_to"] == 2
        assert assigned_ticket["status"] == "in_progress"

    # TC-011: Ticket assignment to non-agent returns 400
    with respx.mock(base_url=settings.USER_SERVICE_URL, assert_all_called=False) as respx_mock:
        respx_mock.get("/internal/users/1").respond(
            200,
            json={"id": 1, "email": "user@test.com", "name": "User 1", "role": "user", "is_active": True}
        )

        bad_assign = await client.put(
            f"/api/v1/tickets/{ticket_id}/assign",
            json={"agent_id": 1},
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert bad_assign.status_code == 400
        assert "not an active agent" in bad_assign.json()["detail"]

    # TC-012: Ticket assignment when user_service is unreachable returns 503
    with respx.mock(base_url=settings.USER_SERVICE_URL, assert_all_called=False) as respx_mock:
        respx_mock.get("/internal/users/2").mock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        unreachable_res = await client.put(
            f"/api/v1/tickets/{ticket_id}/assign",
            json={"agent_id": 2},
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert unreachable_res.status_code == 503
        assert "unavailable" in unreachable_res.json()["detail"].lower()

    # TC-013: Read tickets when user_service is down continues to work (graceful degradation)
    # Reading does not call user_service because token is verified locally
    with respx.mock(base_url=settings.USER_SERVICE_URL, assert_all_called=False) as respx_mock:
        respx_mock.get("/internal/users/2").mock(side_effect=httpx.ConnectError("Down"))
        read_res = await client.get(f"/api/v1/tickets/{ticket_id}", headers={"Authorization": f"Bearer {agent_token}"})
        assert read_res.status_code == 200


@pytest.mark.asyncio
async def test_status_transitions(client: AsyncClient):
    agent_token = make_token(user_id=2, email="agent@test.com", role="agent")

    create_res = await client.post(
        "/api/v1/tickets/",
        json={
            "title": "Bug in billing page",
            "description": "Checkout button disabled",
            "category": "Billing",
            "priority": "urgent"
        },
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    ticket_id = create_res.json()["id"]

    # Valid transition: open -> in_progress
    res = await client.put(
        f"/api/v1/tickets/{ticket_id}/status",
        json={"status": "in_progress"},
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"

    # Valid transition: in_progress -> resolved
    res2 = await client.put(
        f"/api/v1/tickets/{ticket_id}/status",
        json={"status": "resolved"},
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "resolved"
    assert res2.json()["resolved_at"] is not None

    # Valid transition: resolved -> closed
    res3 = await client.put(
        f"/api/v1/tickets/{ticket_id}/status",
        json={"status": "closed"},
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert res3.status_code == 200
    assert res3.json()["status"] == "closed"

    # TC-014: Invalid transition (closed is terminal) returns 400
    invalid_res = await client.put(
        f"/api/v1/tickets/{ticket_id}/status",
        json={"status": "open"},
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert invalid_res.status_code == 400
