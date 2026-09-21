import pytest
import io
from httpx import AsyncClient, ASGITransport
from conftest import make_token
from app.main import app


@pytest.mark.asyncio
async def test_attachment_upload_and_listing(client: AsyncClient):
    user_token = make_token(user_id=101, email="uploader@test.com", role="user")

    # 1. Create ticket
    t_res = await client.post(
        "/api/v1/tickets/",
        json={
            "title": "Attachment Test Ticket",
            "description": "Testing file listing",
            "category": "Testing",
            "priority": "low"
        },
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert t_res.status_code == 201
    ticket_id = t_res.json()["id"]

    # 2. Upload Attachment
    file_bytes = b"Hello world text file content"
    files = {"file": ("report.txt", io.BytesIO(file_bytes), "text/plain")}
    up_res = await client.post(
        f"/api/v1/tickets/{ticket_id}/attachments",
        files=files,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert up_res.status_code == 201
    assert up_res.json()["filename"] == "report.txt"

    # 3. List Attachments
    list_res = await client.get(
        f"/api/v1/tickets/{ticket_id}/attachments",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert list_res.status_code == 200
    attachments = list_res.json()
    assert len(attachments) == 1
    assert attachments[0]["filename"] == "report.txt"
    assert attachments[0]["file_size"] == len(file_bytes)
