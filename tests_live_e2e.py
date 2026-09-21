import asyncio
import httpx

USER_API = "http://localhost:8001/api/v1"
ASSIGN_API = "http://localhost:8002/api/v1"

async def main():
    async with httpx.AsyncClient(timeout=10.0) as client:
        print("=== LIVE E2E SMOKE TEST START ===")
        
        # 1. Health checks
        u_health = await client.get("http://localhost:8001/health")
        assert u_health.status_code == 200, f"user_service unhealthy: {u_health.text}"
        a_health = await client.get("http://localhost:8002/health")
        assert a_health.status_code == 200, f"assign_service unhealthy: {a_health.text}"
        print("✓ Both backend health checks passing (200 OK)")

        # 2. Register User, Agent, Admin
        rand = "live"
        user_email = f"user_{rand}@example.com"
        agent_email = f"agent_{rand}@example.com"
        admin_email = f"admin_{rand}@example.com"
        
        for email, name, role in [
            (user_email, "Customer Alice", "user"),
            (agent_email, "Agent Bob", "agent"),
            (admin_email, "Admin Charlie", "admin")
        ]:
            reg = await client.post(f"{USER_API}/auth/register", json={
                "email": email,
                "name": name,
                "password": "Password123!",
                "role": role
            })
            if reg.status_code not in (201, 409):
                raise AssertionError(f"Registration failed: {reg.text}")
        print("✓ Registered user, agent, admin accounts")

        # 3. Login User & Agent
        user_login = await client.post(f"{USER_API}/auth/login", json={"email": user_email, "password": "Password123!"})
        user_token = user_login.json()["access_token"]
        user_id = user_login.json()["user"]["id"]

        agent_login = await client.post(f"{USER_API}/auth/login", json={"email": agent_email, "password": "Password123!"})
        agent_token = agent_login.json()["access_token"]
        agent_id = agent_login.json()["user"]["id"]
        print("✓ Logged in and received valid JWTs")

        # 4. User Creates Ticket
        ticket_res = await client.post(f"{ASSIGN_API}/tickets/", json={
            "title": "Live E2E Test Ticket - Network Outage",
            "description": "Cannot connect to the customer portal via HTTPS",
            "category": "Network",
            "priority": "urgent"
        }, headers={"Authorization": f"Bearer {user_token}"})
        assert ticket_res.status_code == 201, f"Create ticket failed: {ticket_res.text}"
        ticket_id = ticket_res.json()["id"]
        print(f"✓ Ticket #{ticket_id} created successfully with SLA priority 'urgent'")

        # 5. User Uploads File Attachment
        file_data = b"Sample diagnostic log file content for E2E validation."
        files = {"file": ("diagnostic.txt", file_data, "text/plain")}
        att_res = await client.post(
            f"{ASSIGN_API}/tickets/{ticket_id}/attachments",
            files=files,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert att_res.status_code == 201, f"Attachment upload failed: {att_res.text}"
        print("✓ File attachment uploaded successfully")

        # 6. Verify Attachment Listing
        att_list = await client.get(
            f"{ASSIGN_API}/tickets/{ticket_id}/attachments",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert att_list.status_code == 200, f"Attachment listing failed: {att_list.text}"
        assert len(att_list.json()) >= 1
        assert att_list.json()[0]["filename"] == "diagnostic.txt"
        print("✓ File attachment listing confirmed in database")

        # 7. Agent Claims / Assigns Ticket (Validates cross-service with user_service)
        assign_res = await client.put(
            f"{ASSIGN_API}/tickets/{ticket_id}/assign",
            json={"agent_id": agent_id},
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert assign_res.status_code == 200, f"Assignment failed: {assign_res.text}"
        assert assign_res.json()["assigned_to"] == agent_id
        print(f"✓ Ticket assigned to Agent #{agent_id} (cross-service verified)")

        # 8. User & Agent Discussion (Comments & Internal Notes)
        com1 = await client.post(
            f"{ASSIGN_API}/tickets/{ticket_id}/comments",
            json={"content": "Please check urgently.", "is_internal": False},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert com1.status_code == 201
        
        com2 = await client.post(
            f"{ASSIGN_API}/tickets/{ticket_id}/comments",
            json={"content": "Investigating routing table on switch.", "is_internal": True},
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert com2.status_code == 201
        print("✓ Public and internal threaded comments posted")

        # 9. Agent Resolves Ticket
        status_res = await client.put(
            f"{ASSIGN_API}/tickets/{ticket_id}/status",
            json={"status": "resolved"},
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "resolved"
        assert status_res.json()["resolved_at"] is not None
        print("✓ Ticket resolved successfully (lifecycle transition valid)")

        # 10. Verify Reports
        rep_res = await client.get(
            f"{ASSIGN_API}/reports/sla-compliance",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert rep_res.status_code == 200
        assert rep_res.json()["total_tickets"] >= 1
        print("✓ Analytics and SLA compliance report verified")

        print("=== ALL LIVE E2E JOURNEYS PASSED ===")

if __name__ == "__main__":
    asyncio.run(main())
