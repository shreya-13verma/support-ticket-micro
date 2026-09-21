import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket import Ticket
from app.tasks.sla_tasks import _run_sla_check
from conftest import make_token, TestingSessionLocal


@pytest.mark.asyncio
async def test_sla_policies_crud(client: AsyncClient):
    admin_token = make_token(user_id=1, email="admin@test.com", role="admin")
    user_token = make_token(user_id=2, email="user@test.com", role="user")

    # Non-admin cannot create policy
    bad_res = await client.post(
        "/api/v1/sla/policies",
        json={"priority": "urgent", "response_time_hours": 1, "resolution_time_hours": 4},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert bad_res.status_code == 403

    # Admin creates SLA policy
    create_res = await client.post(
        "/api/v1/sla/policies",
        json={"priority": "urgent", "response_time_hours": 1, "resolution_time_hours": 4},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 201
    assert create_res.json()["resolution_time_hours"] == 4

    # List policies
    list_res = await client.get("/api/v1/sla/policies", headers={"Authorization": f"Bearer {user_token}"})
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


@pytest.mark.asyncio
async def test_sla_breach_detection_and_notification(client: AsyncClient, db_session: AsyncSession):
    user_token = make_token(user_id=10, email="user10@test.com", role="user")

    # Create an overdue ticket directly in DB
    past_time = datetime.now(timezone.utc) - timedelta(hours=2)
    overdue_ticket = Ticket(
        title="Server Down Emergency",
        description="Core database is unreachable",
        category="Infrastructure",
        priority="urgent",
        status="open",
        created_by=10,
        due_at=past_time,
        sla_breached=False
    )
    db_session.add(overdue_ticket)
    await db_session.commit()
    await db_session.refresh(overdue_ticket)

    # TC-018: Run SLA breach check logic
    async def override_session_local():
        return db_session

    # Temporarily monkeypatch AsyncSessionLocal for testing in-memory db
    import app.tasks.sla_tasks as sla_tasks_mod
    orig_factory = sla_tasks_mod.AsyncSessionLocal

    class MockAsyncContext:
        def __init__(self, sess):
            self.sess = sess
        async def __aenter__(self):
            return self.sess
        async def __aexit__(self, exc_type, exc, tb):
            pass

    sla_tasks_mod.AsyncSessionLocal = lambda: MockAsyncContext(db_session)

    try:
        breached_count = await _run_sla_check()
        assert breached_count == 1
    finally:
        sla_tasks_mod.AsyncSessionLocal = orig_factory

    # Verify notification was recorded for user 10
    notifs_res = await client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {user_token}"})
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    assert len(notifs) >= 1
    assert "SLA Breach Alert" in notifs[0]["title"]
    assert notifs[0]["is_read"] is False

    # Mark notification as read
    notif_id = notifs[0]["id"]
    read_res = await client.put(f"/api/v1/notifications/{notif_id}/read", headers={"Authorization": f"Bearer {user_token}"})
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True
