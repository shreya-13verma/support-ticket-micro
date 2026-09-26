import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_slug_generation_and_collision(client: AsyncClient, admin_headers):
    """TC-001: Automatic slug generation and numeric suffix on collision."""
    cat = await client.post("/api/v1/categories", json={"name": "Guides"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    # First doc
    doc1 = await client.post(
        "/api/v1/docs",
        json={
            "title": "How to Reset Password?",
            "content": "Click forgot password link.",
            "category_id": cat_id,
            "status": "published"
        },
        headers=admin_headers
    )
    assert doc1.status_code == 201
    assert doc1.json()["slug"] == "how-to-reset-password"

    # Second doc with exact same title
    doc2 = await client.post(
        "/api/v1/docs",
        json={
            "title": "How to Reset Password?",
            "content": "Follow mobile instructions.",
            "category_id": cat_id,
            "status": "published"
        },
        headers=admin_headers
    )
    assert doc2.status_code == 201
    assert doc2.json()["slug"] == "how-to-reset-password-1"


@pytest.mark.asyncio
async def test_agent_creates_draft_document(client: AsyncClient, agent_headers, admin_headers):
    """TC-007: Agent can create support document; non-admin author defaults to draft."""
    cat = await client.post("/api/v1/categories", json={"name": "Support"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    resp = await client.post(
        "/api/v1/docs",
        json={
            "title": "Troubleshooting Network Latency",
            "summary": "Steps to resolve high ping times",
            "content": "1. Run traceroute.\n2. Check MTU settings.",
            "category_id": cat_id,
            "status": "published",  # Non-admin agent should be forced to draft
            "tag_names": ["Network", "Diagnostics"]
        },
        headers=agent_headers
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "draft"
    assert data["author_id"] == 2
    assert len(data["tags"]) == 2


@pytest.mark.asyncio
async def test_admin_creates_published_document(client: AsyncClient, admin_headers):
    """TC-008: Admin can create directly in published status."""
    cat = await client.post("/api/v1/categories", json={"name": "Getting Started"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    resp = await client.post(
        "/api/v1/docs",
        json={
            "title": "Welcome to Support Portal",
            "content": "Overview of our services.",
            "category_id": cat_id,
            "status": "published",
            "is_featured": True
        },
        headers=admin_headers
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "published"
    assert data["is_featured"] is True


@pytest.mark.asyncio
async def test_public_customer_list_only_sees_published(client: AsyncClient, admin_headers, agent_headers):
    """TC-009: Public / customer endpoint returns only published documents."""
    cat = await client.post("/api/v1/categories", json={"name": "General"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    # 1 published doc
    await client.post(
        "/api/v1/docs",
        json={"title": "Public Guide", "content": "Content", "category_id": cat_id, "status": "published"},
        headers=admin_headers
    )
    # 1 draft doc
    await client.post(
        "/api/v1/docs",
        json={"title": "Draft Guide", "content": "Content", "category_id": cat_id, "status": "draft"},
        headers=admin_headers
    )

    # Anonymous user list
    resp = await client.get("/api/v1/docs")
    assert resp.status_code == 200
    docs = resp.json()["documents"]
    assert len(docs) == 1
    assert docs[0]["title"] == "Public Guide"


@pytest.mark.asyncio
async def test_admin_agent_list_with_status_filter(client: AsyncClient, admin_headers, agent_headers):
    """TC-010: Admin / Agent can filter and view draft or archived documents."""
    cat = await client.post("/api/v1/categories", json={"name": "Internal"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    await client.post(
        "/api/v1/docs",
        json={"title": "Published 1", "content": "C", "category_id": cat_id, "status": "published"},
        headers=admin_headers
    )
    await client.post(
        "/api/v1/docs",
        json={"title": "Draft 1", "content": "C", "category_id": cat_id, "status": "draft"},
        headers=admin_headers
    )

    # Admin filtering for drafts
    resp_admin = await client.get("/api/v1/docs?status=draft", headers=admin_headers)
    assert resp_admin.status_code == 200
    assert len(resp_admin.json()["documents"]) == 1
    assert resp_admin.json()["documents"][0]["title"] == "Draft 1"


@pytest.mark.asyncio
async def test_get_published_doc_and_view_count(client: AsyncClient, admin_headers):
    """TC-011: Getting a published document returns details and increments view count."""
    cat = await client.post("/api/v1/categories", json={"name": "FAQ"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    create_resp = await client.post(
        "/api/v1/docs",
        json={"title": "FAQ Item 1", "content": "Answer 1", "category_id": cat_id, "status": "published"},
        headers=admin_headers
    )
    slug = create_resp.json()["slug"]

    # First fetch
    get1 = await client.get(f"/api/v1/docs/{slug}")
    assert get1.status_code == 200
    assert get1.json()["view_count"] == 1

    # Second fetch
    get2 = await client.get(f"/api/v1/docs/{slug}")
    assert get2.status_code == 200
    assert get2.json()["view_count"] == 2


@pytest.mark.asyncio
async def test_customer_gets_draft_doc_returns_404(client: AsyncClient, admin_headers, user_headers):
    """TC-012: Accessing draft document as a customer returns 404."""
    cat = await client.post("/api/v1/categories", json={"name": "Restricted"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    create_resp = await client.post(
        "/api/v1/docs",
        json={"title": "Internal Secret Draft", "content": "Secret", "category_id": cat_id, "status": "draft"},
        headers=admin_headers
    )
    slug = create_resp.json()["slug"]

    # Public visitor access
    resp_anon = await client.get(f"/api/v1/docs/{slug}")
    assert resp_anon.status_code == 404

    # User role access
    resp_user = await client.get(f"/api/v1/docs/{slug}", headers=user_headers)
    assert resp_user.status_code == 404


@pytest.mark.asyncio
async def test_author_updates_own_draft_vs_non_author_forbidden(
    client: AsyncClient,
    admin_headers,
    agent_headers,
    agent2_headers
):
    """TC-013: Author can update their draft; another agent receives 403."""
    cat = await client.post("/api/v1/categories", json={"name": "Dev"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    # Agent 1 (sub=2) creates draft
    create_resp = await client.post(
        "/api/v1/docs",
        json={"title": "Agent 1 Guide", "content": "Initial Draft", "category_id": cat_id},
        headers=agent_headers
    )
    doc_id = create_resp.json()["id"]

    # Agent 2 (sub=4) attempts update
    resp_agent2 = await client.put(
        f"/api/v1/docs/{doc_id}",
        json={"content": "Agent 2 Hijack"},
        headers=agent2_headers
    )
    assert resp_agent2.status_code == 403

    # Agent 1 (author) updates successfully
    resp_author = await client.put(
        f"/api/v1/docs/{doc_id}",
        json={"content": "Authoritative Revision"},
        headers=agent_headers
    )
    assert resp_author.status_code == 200
    assert resp_author.json()["content"] == "Authoritative Revision"


@pytest.mark.asyncio
async def test_admin_updates_status(client: AsyncClient, admin_headers, user_headers):
    """TC-014: Admin transitions document status."""
    cat = await client.post("/api/v1/categories", json={"name": "Lifecycle"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    create_resp = await client.post(
        "/api/v1/docs",
        json={"title": "Lifecycle Doc", "content": "Testing status", "category_id": cat_id, "status": "draft"},
        headers=admin_headers
    )
    doc_id = create_resp.json()["id"]

    # Admin publishes
    pub_resp = await client.patch(
        f"/api/v1/docs/{doc_id}/status",
        json={"status": "published"},
        headers=admin_headers
    )
    assert pub_resp.status_code == 200
    assert pub_resp.json()["status"] == "published"

    # User attempts status change
    user_resp = await client.patch(
        f"/api/v1/docs/{doc_id}/status",
        json={"status": "archived"},
        headers=user_headers
    )
    assert user_resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_deletes_document(client: AsyncClient, admin_headers, agent_headers):
    """TC-015: Admin deletes document (204 No Content); Agent receives 403."""
    cat = await client.post("/api/v1/categories", json={"name": "Deletion"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    create_resp = await client.post(
        "/api/v1/docs",
        json={"title": "To be deleted", "content": "Goodbye", "category_id": cat_id, "status": "published"},
        headers=admin_headers
    )
    doc_id = create_resp.json()["id"]

    # Agent deletion forbidden
    agent_del = await client.delete(f"/api/v1/docs/{doc_id}", headers=agent_headers)
    assert agent_del.status_code == 403

    # Admin deletion succeeds
    admin_del = await client.delete(f"/api/v1/docs/{doc_id}", headers=admin_headers)
    assert admin_del.status_code == 204

    # Verify 404
    get_resp = await client.get(f"/api/v1/docs/{doc_id}", headers=admin_headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_explicit_view_tracking_and_sorting(client: AsyncClient, admin_headers):
    """Explicit view tracking and sorting by views and title."""
    cat = await client.post("/api/v1/categories", json={"name": "Sort & Views"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    d1 = await client.post(
        "/api/v1/docs",
        json={"title": "Alpha Document", "content": "Alpha", "category_id": cat_id, "status": "published"},
        headers=admin_headers
    )
    d1_id = d1.json()["id"]

    d2 = await client.post(
        "/api/v1/docs",
        json={"title": "Beta Document", "content": "Beta", "category_id": cat_id, "status": "published"},
        headers=admin_headers
    )
    d2_id = d2.json()["id"]

    # Explicit view track on d2
    view_resp = await client.post(f"/api/v1/docs/{d2_id}/view")
    assert view_resp.status_code == 200
    assert view_resp.json()["view_count"] == 1

    # Sort by views desc
    sort_views = await client.get(f"/api/v1/docs?category_id={cat_id}&sort_by=view_count&sort_dir=desc")
    assert sort_views.status_code == 200
    assert sort_views.json()["documents"][0]["id"] == d2_id

    # Sort by title asc
    sort_title = await client.get(f"/api/v1/docs?category_id={cat_id}&sort_by=title&sort_dir=asc")
    assert sort_title.status_code == 200
    assert sort_title.json()["documents"][0]["title"] == "Alpha Document"

