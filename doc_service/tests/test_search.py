import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_search_and_filtering(client: AsyncClient, admin_headers):
    """TC-017: Full-text search, category filter, tag filter, and sort order."""
    # 1. Create categories
    cat1_resp = await client.post("/api/v1/categories", json={"name": "Billing"}, headers=admin_headers)
    cat1_id = cat1_resp.json()["id"]

    cat2_resp = await client.post("/api/v1/categories", json={"name": "Security"}, headers=admin_headers)
    cat2_id = cat2_resp.json()["id"]

    # 2. Create documents
    await client.post(
        "/api/v1/docs",
        json={
            "title": "Understanding Invoices & Taxes",
            "summary": "Everything about payment slips and vat taxes.",
            "content": "Look at section 3 of your invoice for tax details.",
            "category_id": cat1_id,
            "status": "published",
            "tag_names": ["Invoices", "Finance"]
        },
        headers=admin_headers
    )

    await client.post(
        "/api/v1/docs",
        json={
            "title": "Configuring Multi-Factor Authentication (MFA)",
            "summary": "Protect your account with authenticator apps.",
            "content": "Scan the QR code in Google Authenticator or Authy.",
            "category_id": cat2_id,
            "status": "published",
            "tag_names": ["Security", "MFA"]
        },
        headers=admin_headers
    )

    await client.post(
        "/api/v1/docs",
        json={
            "title": "Credit Card Declined Troubleshooting",
            "summary": "Common reasons why card payments fail.",
            "content": "Verify CVV, expiration date, and international transaction approval.",
            "category_id": cat1_id,
            "status": "published",
            "tag_names": ["Finance", "Payments"]
        },
        headers=admin_headers
    )

    # 3. Search query "invoice"
    search_resp = await client.get("/api/v1/docs?search=invoice")
    assert search_resp.status_code == 200
    docs = search_resp.json()["documents"]
    assert len(docs) == 1
    assert "Invoices" in docs[0]["title"]

    # 4. Filter by category
    cat_filter_resp = await client.get(f"/api/v1/docs?category_id={cat1_id}")
    assert cat_filter_resp.status_code == 200
    assert cat_filter_resp.json()["total"] == 2

    # 5. Filter by tag slug
    tag_filter_resp = await client.get("/api/v1/docs?tag_slug=finance")
    assert tag_filter_resp.status_code == 200
    assert tag_filter_resp.json()["total"] == 2

    # 6. Pagination
    page_resp = await client.get("/api/v1/docs?limit=1&page=1")
    assert page_resp.status_code == 200
    assert len(page_resp.json()["documents"]) == 1
    assert page_resp.json()["total"] == 3
    assert page_resp.json()["total_pages"] == 3
