import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_create_category(client: AsyncClient, admin_headers):
    """TC-003: Admin can create category successfully."""
    response = await client.post(
        "/api/v1/categories",
        json={
            "name": "Billing & Payments",
            "description": "Guides on billing, invoices, and payment methods",
            "display_order": 1,
            "is_active": True
        },
        headers=admin_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Billing & Payments"
    assert data["slug"] == "billing-payments"
    assert data["display_order"] == 1


@pytest.mark.asyncio
async def test_non_admin_create_category_forbidden(client: AsyncClient, agent_headers, user_headers):
    """TC-004: Non-admin users cannot create categories (403 Forbidden)."""
    resp_agent = await client.post(
        "/api/v1/categories",
        json={"name": "Agent Category"},
        headers=agent_headers
    )
    assert resp_agent.status_code == 403

    resp_user = await client.post(
        "/api/v1/categories",
        json={"name": "User Category"},
        headers=user_headers
    )
    assert resp_user.status_code == 403


@pytest.mark.asyncio
async def test_delete_category_with_active_documents_conflict(client: AsyncClient, admin_headers):
    """TC-005: Deleting category with active documents returns 409 Conflict."""
    # 1. Create Category
    cat_resp = await client.post(
        "/api/v1/categories",
        json={"name": "Technical Support"},
        headers=admin_headers
    )
    assert cat_resp.status_code == 201
    cat_id = cat_resp.json()["id"]

    # 2. Create Document in this category
    doc_resp = await client.post(
        "/api/v1/docs",
        json={
            "title": "Fixing 500 Errors",
            "content": "Step 1: Check logs.",
            "category_id": cat_id,
            "status": "published"
        },
        headers=admin_headers
    )
    assert doc_resp.status_code == 201

    # 3. Attempt to delete category
    del_resp = await client.delete(f"/api/v1/categories/{cat_id}", headers=admin_headers)
    assert del_resp.status_code == 409
    assert "associated" in del_resp.json()["detail"]


@pytest.mark.asyncio
async def test_delete_empty_category_success(client: AsyncClient, admin_headers):
    """Admin can delete empty category (204 No Content)."""
    cat_resp = await client.post(
        "/api/v1/categories",
        json={"name": "Empty Category"},
        headers=admin_headers
    )
    cat_id = cat_resp.json()["id"]

    del_resp = await client.delete(f"/api/v1/categories/{cat_id}", headers=admin_headers)
    assert del_resp.status_code == 204

    # Verify 404
    get_resp = await client.get(f"/api/v1/categories/{cat_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_update_category(client: AsyncClient, admin_headers):
    """Admin can update category metadata."""
    cat_resp = await client.post(
        "/api/v1/categories",
        json={"name": "Old Category Name", "display_order": 5},
        headers=admin_headers
    )
    cat_id = cat_resp.json()["id"]

    update_resp = await client.put(
        f"/api/v1/categories/{cat_id}",
        json={"name": "New Category Name", "display_order": 2},
        headers=admin_headers
    )
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["name"] == "New Category Name"
    assert data["display_order"] == 2


@pytest.mark.asyncio
async def test_list_categories_active_filtering(client: AsyncClient, admin_headers):
    """Visitors see only active categories; admins see all."""
    await client.post(
        "/api/v1/categories",
        json={"name": "Active Cat", "is_active": True},
        headers=admin_headers
    )
    await client.post(
        "/api/v1/categories",
        json={"name": "Inactive Cat", "is_active": False},
        headers=admin_headers
    )

    # Visitor call (no auth)
    resp_anon = await client.get("/api/v1/categories")
    assert resp_anon.status_code == 200
    anon_cats = resp_anon.json()["categories"]
    assert len(anon_cats) == 1
    assert anon_cats[0]["name"] == "Active Cat"

    # Admin call
    resp_admin = await client.get("/api/v1/categories", headers=admin_headers)
    assert resp_admin.status_code == 200
    admin_cats = resp_admin.json()["categories"]
    assert len(admin_cats) == 2
