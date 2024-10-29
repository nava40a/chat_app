from starlette.websockets import WebSocketState
import json
from typing import List, Dict
from fastapi.websockets import WebSocket


class WebSocketPool:
    def __init__(self):
        self.connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.connections:
            self.connections[user_id] = []
        self.connections[user_id].append(websocket)
        for other_user_id in self.connections:
            if other_user_id != user_id:
                status = 'online' if self.is_online(other_user_id) else 'offline'
                await self.notify_user_status(other_user_id, status)
            print(f'Подключенные пользователи: {self.connections}')

    async def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.connections:
            if websocket in self.connections[user_id]:
                self.connections[user_id].remove(websocket)
            if not self.connections[user_id]:
                await self.notify_user_status(user_id, 'offline')
                del self.connections[user_id]
                print(
                    f'Пользователь {user_id} отключен. '
                    'Текущие подключения: {self.connections}'
                )
        print(f'Подключенные пользователи: {self.connections}')

    def is_online(self, user_id: int):
        return (
            user_id in self.connections and len(self.connections[user_id]) > 0
        )

    async def notify_user_status(self, user_id: int, status: str):
        message = {
        'type': 'status_update',
        'user_id': user_id,
        'status': status
    }
        for other_user_id, websockets in self.connections.items():
            if other_user_id != user_id:
                for websocket in websockets:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_text(json.dumps(message))
                    else:
                        print(
                            f'WebSocket для пользователя {other_user_id} '
                            'не подключен, сообщение о статусе не отправлено.'
                        )
