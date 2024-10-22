import bcrypt, uuid

from .websocket_manager import WebSocketPool


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля."""

    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def create_token() -> str:
    """Создание токена."""

    return str(uuid.uuid4())


async def send_message(
        user_id: int,
        message: str,
        websocket_pool: WebSocketPool
    ):
    """Отправка сообщения всем активным подключениям пользователя."""

    websockets = websocket_pool.connections[user_id]
    
    for websocket in websockets:
        try:
            print(f'Отправка сообщения пользователю {user_id}: {message}')
            await websocket.send_text(message)
        except Exception as e:
            print(f'Ошибка при отправке сообщения пользователю {user_id}: {e}')
