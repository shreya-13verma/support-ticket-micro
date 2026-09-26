import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """TC-020: Health check endpoint returns 200 OK and database connected."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "doc_service"
    assert data["database"] == "connected"


@pytest.mark.asyncio
async def test_internal_suggestions_valid_key(client: AsyncClient, admin_headers, internal_headers):
    """TC-018: Internal suggestion queries succeed with valid X-Internal-API-Key."""
    cat = await client.post("/api/v1/categories", json={"name": "Billing & Invoices"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    await client.post(
        "/api/v1/docs",
        json={
            "title": "Resolving Refund Delays",
            "summary": "Explains the 5-10 business day turnaround for credit cards.",
            "content": "Banks typically process refunds within 5-10 business days.",
            "category_id": cat_id,
            "status": "published"
        },
        headers=admin_headers
    )

    resp = await client.get(
        "/internal/docs/suggest?q=refund",
        headers=internal_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["query"] == "refund"
    assert len(data["suggestions"]) == 1
    assert data["suggestions"][0]["title"] == "Resolving Refund Delays"


@pytest.mark.asyncio
async def test_internal_suggestions_invalid_key_rejected(client: AsyncClient):
    """TC-019: Missing or invalid X-Internal-API-Key returns 403 Forbidden."""
    # Missing key
    resp_missing = await client.get("/internal/docs/suggest?q=refund")
    assert resp_missing.status_code == 403

    # Invalid key
    resp_invalid = await client.get(
        "/internal/docs/suggest?q=refund",
        headers={"X-Internal-API-Key": "wrong_key_xyz"}
    )
    assert resp_invalid.status_code == 403


@pytest.mark.asyncio
async def test_internal_get_document_by_id(client: AsyncClient, admin_headers, internal_headers):
    """Internal service lookup of single document."""
    cat = await client.post("/api/v1/categories", json={"name": "Internal Fetch"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    doc = await client.post(
        "/api/v1/docs",
        json={"title": "Internal Lookup Target", "content": "Secret Content", "category_id": cat_id},
        headers=admin_headers
    )
    doc_id = doc.json()["id"]

    # Valid internal call
    resp = await client.get(f"/internal/docs/{doc_id}", headers=internal_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Internal Lookup Target"

    # Invalid internal key call
    resp_bad = await client.get(f"/internal/docs/{doc_id}", headers={"X-Internal-API-Key": "bad"})
    assert resp_bad.status_code == 403

