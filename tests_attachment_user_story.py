import asyncio
import httpx

USER_API = "http://localhost:8001/api/v1"
ASSIGN_API = "http://localhost:8002/api/v1"

async def test_full_user_story():
    async with httpx.AsyncClient(timeout=10.0) as client:
        print("--- USER STORY: TICKET RAISING, ATTACHMENT UPLOAD & DOWNLOAD ---")
        
        # 1. Login user
        login_res = await client.post(f"{USER_API}/auth/login", json={
            "email": "user_live@example.com",
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        user_token = login_res.json()["access_token"]
        
        # 2. Create ticket
        t_res = await client.post(f"{ASSIGN_API}/tickets/", json={
            "title": "Hardware issue with laptop monitor",
            "description": "Attached screenshot and crash dump",
            "category": "Hardware",
            "priority": "high"
        }, headers={"Authorization": f"Bearer {user_token}"})
        assert t_res.status_code == 201
        ticket_id = t_res.json()["id"]
        print(f"1. Created Ticket #{ticket_id}")

        # 3. Upload text file
        original_content = b"Kernel log: GPU memory error at address 0x7FFF"
        files = {"file": ("gpu_crash.log", original_content, "text/plain")}
        up_res = await client.post(
            f"{ASSIGN_API}/tickets/{ticket_id}/attachments",
            files=files,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert up_res.status_code == 201
        attachment_id = up_res.json()["id"]
        print(f"2. Uploaded attachment id={attachment_id}, filename={up_res.json()['filename']}")

        # 4. List attachments
        list_res = await client.get(
            f"{ASSIGN_API}/tickets/{ticket_id}/attachments",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) >= 1
        assert items[0]["id"] == attachment_id
        print(f"3. Listed attachments: found {len(items)} items")

        # 5. Download attachment and verify byte parity
        dl_res = await client.get(
            f"{ASSIGN_API}/tickets/{ticket_id}/attachments/{attachment_id}/download",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert dl_res.status_code == 200, f"Download failed: {dl_res.status_code}"
        assert dl_res.content == original_content, "Downloaded content does not match original uploaded bytes"
        print(f"4. Downloaded attachment #{attachment_id} — byte content verified identical ({len(dl_res.content)} bytes)")

        print("--- USER STORY COMPLETED AND FULLY VERIFIED ---")

if __name__ == "__main__":
    asyncio.run(test_full_user_story())
