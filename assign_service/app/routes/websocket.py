from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    def __init__(self):
        # Maps ticket_id to set of active WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, ticket_id: int, websocket: WebSocket):
        await websocket.accept()
        if ticket_id not in self.active_connections:
            self.active_connections[ticket_id] = set()
        self.active_connections[ticket_id].add(websocket)

    def disconnect(self, ticket_id: int, websocket: WebSocket):
        if ticket_id in self.active_connections:
            self.active_connections[ticket_id].discard(websocket)
            if not self.active_connections[ticket_id]:
                del self.active_connections[ticket_id]

    async def broadcast_ticket_update(self, ticket_id: int, message: dict):
        if ticket_id in self.active_connections:
            dead_connections = set()
            for connection in self.active_connections[ticket_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.add(connection)
            for dead in dead_connections:
                self.active_connections[ticket_id].discard(dead)


ws_manager = ConnectionManager()


@router.websocket("/ws/tickets/{ticket_id}")
async def websocket_ticket_endpoint(websocket: WebSocket, ticket_id: int):
    await ws_manager.connect(ticket_id, websocket)
    try:
        while True:
            # Echo / receive client ping or message
            data = await websocket.receive_text()
            await websocket.send_json({"type": "PONG", "payload": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(ticket_id, websocket)
