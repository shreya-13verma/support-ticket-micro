import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_tags(client: AsyncClient, agent_headers, admin_headers):
    """TC-006: Create unique tag and list tags."""
    # Agent creates tag
    resp1 = await client.post(
        "/api/v1/tags",
        json={"name": "Troubleshooting"},
        headers=agent_headers
    )
    assert resp1.status_code == 201
    data1 = resp1.json()
    assert data1["name"] == "Troubleshooting"
    assert data1["slug"] == "troubleshooting"

    # Admin creates second tag
    resp2 = await client.post(
        "/api/v1/tags",
        json={"name": "Authentication"},
        headers=admin_headers
    )
    assert resp2.status_code == 201

    # List tags (public)
    list_resp = await client.get("/api/v1/tags")
    assert list_resp.status_code == 200
    tags = list_resp.json()["tags"]
    assert len(tags) == 2


@pytest.mark.asyncio
async def test_duplicate_tag_rejected(client: AsyncClient, admin_headers):
    """Creating duplicate tag name returns 400 Bad Request."""
    await client.post(
        "/api/v1/tags",
        json={"name": "Security"},
        headers=admin_headers
    )

    duplicate_resp = await client.post(
        "/api/v1/tags",
        json={"name": "Security"},
        headers=admin_headers
    )
    assert duplicate_resp.status_code == 400
    assert "already exists" in duplicate_resp.json()["detail"]
