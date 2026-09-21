import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_user_management_and_rbac(client: AsyncClient):
    # Register Admin
    admin_res = await client.post("/api/v1/auth/register", json={
        "email": "admin@example.com",
        "name": "System Admin",
        "password": "adminpassword123",
        "role": "admin"
    })
    admin_id = admin_res.json()["id"]

    # Register Regular User
    user_res = await client.post("/api/v1/auth/register", json={
        "email": "user@example.com",
        "name": "Regular User",
        "password": "userpassword123",
        "role": "user"
    })
    user_id = user_res.json()["id"]

    # Login Admin
    admin_login = await client.post("/api/v1/auth/login", json={
        "email": "admin@example.com",
        "password": "adminpassword123"
    })
    admin_token = admin_login.json()["access_token"]

    # Login User
    user_login = await client.post("/api/v1/auth/login", json={
        "email": "user@example.com",
        "password": "userpassword123"
    })
    user_token = user_login.json()["access_token"]

    # TC-005: Non-admin listing users gets 403
    forbidden_list = await client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert forbidden_list.status_code == 403

    # Admin listing users succeeds
    admin_list = await client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_list.status_code == 200
    assert len(admin_list.json()) >= 2

    # User can view self
    me_res = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert me_res.status_code == 200
    assert me_res.json()["id"] == user_id

    # User cannot view another user's profile
    forbidden_view = await client.get(
        f"/api/v1/users/{admin_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert forbidden_view.status_code == 403

    # Admin updates user role to agent
    update_res = await client.put(
        f"/api/v1/users/{user_id}",
        json={"role": "agent"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["role"] == "agent"
