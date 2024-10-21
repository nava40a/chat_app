from typing import List, Dict
from fastapi.websockets import WebSocket


class WebSocketPool:
    """Пул для хранения активных подключений."""

    def __init__(self):
        # Хранение подключений в формате {user_id: WebSocket}
        self.connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        if user_id not in self.connections:
            self.connections[user_id] = []
        self.connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.connections:
            self.connections[user_id].remove(websocket)
            if not self.connections[user_id]:
                del self.connections[user_id]

    def is_online(self, user_id: int):
        return user_id in self.connections
