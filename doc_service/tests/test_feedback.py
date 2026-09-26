import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_submit_feedback_atomic_counts(client: AsyncClient, admin_headers, user_headers, agent_headers):
    """TC-016: Submitting feedback updates helpful/not_helpful count atomically."""
    cat = await client.post("/api/v1/categories", json={"name": "Feedback Cat"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    doc_resp = await client.post(
        "/api/v1/docs",
        json={"title": "Feedback Target Guide", "content": "Helpful article.", "category_id": cat_id, "status": "published"},
        headers=admin_headers
    )
    doc_id = doc_resp.json()["id"]

    # 1. User submits positive feedback
    fb1 = await client.post(
        f"/api/v1/docs/{doc_id}/feedback",
        json={"is_helpful": True, "comment": "Clear instructions!"},
        headers=user_headers
    )
    assert fb1.status_code == 201
    assert fb1.json()["is_helpful"] is True

    # 2. Anonymous visitor submits negative feedback
    fb2 = await client.post(
        f"/api/v1/docs/{doc_id}/feedback",
        json={"is_helpful": False, "comment": "Did not work on Linux."}
    )
    assert fb2.status_code == 201
    assert fb2.json()["is_helpful"] is False

    # 3. Another user submits positive feedback
    fb3 = await client.post(
        f"/api/v1/docs/{doc_id}/feedback",
        json={"is_helpful": True}
    )
    assert fb3.status_code == 201

    # 4. Check document metrics
    doc_check = await client.get(f"/api/v1/docs/{doc_id}", headers=admin_headers)
    assert doc_check.status_code == 200
    data = doc_check.json()
    assert data["helpful_count"] == 2
    assert data["not_helpful_count"] == 1

    # 5. Check stats endpoint
    stats_resp = await client.get(f"/api/v1/docs/{doc_id}/feedback/stats", headers=agent_headers)
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["helpful_count"] == 2
    assert stats["not_helpful_count"] == 1
    assert stats["total_feedbacks"] == 3
    assert stats["helpful_ratio"] == 66.67


@pytest.mark.asyncio
async def test_feedback_on_draft_document_rejected(client: AsyncClient, admin_headers):
    """Feedback on draft document returns 400 Bad Request."""
    cat = await client.post("/api/v1/categories", json={"name": "Draft Feedback"}, headers=admin_headers)
    cat_id = cat.json()["id"]

    doc_resp = await client.post(
        "/api/v1/docs",
        json={"title": "Draft Not Live", "content": "Unpublished", "category_id": cat_id, "status": "draft"},
        headers=admin_headers
    )
    doc_id = doc_resp.json()["id"]

    fb_resp = await client.post(
        f"/api/v1/docs/{doc_id}/feedback",
        json={"is_helpful": True}
    )
    assert fb_resp.status_code == 400
    assert "published" in fb_resp.json()["detail"].lower()
