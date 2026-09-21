import io
import pytest
from httpx import AsyncClient
from conftest import make_token


@pytest.mark.asyncio
async def test_comments_and_audit_history(client: AsyncClient):
    user_token = make_token(user_id=1, email="alice@test.com", role="user")
    agent_token = make_token(user_id=2, email="bob@test.com", role="agent")

    # Create ticket
    create_res = await client.post(
        "/api/v1/tickets/",
        json={"title": "Printer Broken", "description": "Paper jam", "category": "Hardware", "priority": "low"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    ticket_id = create_res.json()["id"]

    # TC-015: User adds comment
    com_res = await client.post(
        f"/api/v1/tickets/{ticket_id}/comments",
        json={"content": "I tried restarting it", "is_internal": False},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert com_res.status_code == 201
    assert com_res.json()["author_name"] == "alice@test.com"

    # Agent adds internal comment
    internal_res = await client.post(
        f"/api/v1/tickets/{ticket_id}/comments",
        json={"content": "Internal tech note: roller issue", "is_internal": True},
        headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert internal_res.status_code == 201

    # User listing comments does not see internal note
    user_coms = await client.get(f"/api/v1/tickets/{ticket_id}/comments", headers={"Authorization": f"Bearer {user_token}"})
    assert user_coms.status_code == 200
    assert len(user_coms.json()) == 1

    # Agent listing comments sees both
    agent_coms = await client.get(f"/api/v1/tickets/{ticket_id}/comments", headers={"Authorization": f"Bearer {agent_token}"})
    assert agent_coms.status_code == 200
    assert len(agent_coms.json()) == 2

    # Verify audit history
    history = await client.get(f"/api/v1/tickets/{ticket_id}/history", headers={"Authorization": f"Bearer {user_token}"})
    assert history.status_code == 200
    assert len(history.json()) >= 2  # Create + comment


@pytest.mark.asyncio
async def test_attachments_upload(client: AsyncClient):
    user_token = make_token(user_id=1, email="alice@test.com", role="user")

    create_res = await client.post(
        "/api/v1/tickets/",
        json={"title": "PDF Crash", "description": "Crash log attached", "category": "Software", "priority": "medium"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    ticket_id = create_res.json()["id"]

    # TC-016: Upload valid attachment (PNG image)
    file_content = b"\x89PNG\r\n\x1a\nfakeimagecontent"
    files = {"file": ("screenshot.png", io.BytesIO(file_content), "image/png")}
    up_res = await client.post(
        f"/api/v1/tickets/{ticket_id}/attachments",
        files=files,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert up_res.status_code == 201
    assert up_res.json()["filename"] == "screenshot.png"

    # TC-017: Upload forbidden file extension (.exe) returns 400
    exe_files = {"file": ("malware.exe", io.BytesIO(b"binary"), "application/octet-stream")}
    bad_up = await client.post(
        f"/api/v1/tickets/{ticket_id}/attachments",
        files=exe_files,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert bad_up.status_code == 400


@pytest.mark.asyncio
async def test_reports_endpoints(client: AsyncClient):
    admin_token = make_token(user_id=1, email="admin@test.com", role="admin")

    # TC-019: SLA compliance report
    sla_rep = await client.get("/api/v1/reports/sla-compliance", headers={"Authorization": f"Bearer {admin_token}"})
    assert sla_rep.status_code == 200
    assert "compliance_rate_percentage" in sla_rep.json()

    # Agent performance report
    perf_rep = await client.get("/api/v1/reports/agent-performance", headers={"Authorization": f"Bearer {admin_token}"})
    assert perf_rep.status_code == 200
    assert "metrics" in perf_rep.json()
