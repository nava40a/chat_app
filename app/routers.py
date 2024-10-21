import json
import redis.asyncio as aioredis

from fastapi import (APIRouter,
                     Depends,
                     HTTPException,
                     status,
                     WebSocket,
                     WebSocketDisconnect)
from sqlalchemy.orm import Session
from typing import List

from .database import get_db
from .models import User
from .schemas import UserCreate, UserLogin, MessageBase, UserBase, ChatIdRequest
from .crud import (create_user,
                   update_user_token,
                   save_message,
                   get_messages_history,
                   get_current_user,
                   get_user_by_tg_username,
                   subscribe_user_to_tgbot,
                   get_subscribed_users)
from .utils import verify_password, validate_token, send_message
from .websocket_manager import WebSocketPool


websocket_pool = WebSocketPool()

http_router = APIRouter()
ws_router = APIRouter()
redis_client = aioredis.from_url('redis://redis:6379')


@http_router.post('/register')
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Регистрация пользователя."""

    # Проверка, существует ли пользователь с таким именем
    existing_user = db.query(User).filter(
        User.username == user.username
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail='Пользователь с таким именем уже зарегистрирован.'
        )

    new_user = create_user(db, user)
    
    return {
        'msg': 'Пользователь успешно зарегистрирован',
        'auth_token': new_user.auth_token
    }


@http_router.post('/login')
async def login(user: UserLogin, db: Session = Depends(get_db)):
    """Вход в систему."""

    # Проверяем, существует ли пользователь
    existing_user = db.query(User).filter(
        User.username == user.username
    ).first()
    
    if not existing_user or not verify_password(
        user.password,
        existing_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Неверное имя пользователя или пароль'
        )

    # Обновляем токен
    updated_user = update_user_token(db, existing_user)

    return {
        'message': 'Вы успешно авторизованы.',
        'auth_token': updated_user.auth_token
    }


@http_router.get(
        '/messages/history/{receiver_id}',
        response_model=List[MessageBase]
    )
async def read_messages_history(
    receiver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Просмотр истории сообщений."""

    sender_id = current_user.id
    return get_messages_history(db, sender_id, receiver_id)


@ws_router.websocket('/ws/{user_id}')
async def handler_websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Маршрут для обработки вебсокетного эндпоинта."""

    await websocket.accept()

    # Проверка токена
    token = websocket.headers.get('Authorization')
    if token:
        token = token.split(' ')[1]
    if not validate_token(token, user_id, db):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket_pool.connect(websocket, user_id)

    # Отправляем недоставленные сообщения пользователю при подключении
    unsent_key = f'unsent_messages:{user_id}'
    unsent_messages = await redis_client.lrange(unsent_key, 0, -1)
    for message in unsent_messages:
        message_data = json.loads(message)
        sender_id = message_data['sender_id']
        content = message_data['content']
        await websocket.send_text(f'Message from {sender_id}: {content}')
    await redis_client.delete(unsent_key)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            receiver_id = message['receiver_id']
            message_content = message['content']
            save_message(db, user_id, receiver_id, message_content)

            # Если пользователь онлайн, отправляем сообщение
            if websocket_pool.is_online(receiver_id):
                await send_message(
                    receiver_id,
                    message_content,
                    websocket_pool
                )

            else:
                print(
                    f'Пользователь {receiver_id} оффлайн.'
                    f'Сообщение не отправлено.'
                )
                # Сохраняем недоставленные сообщения в Redis
                unsent_key = f'unsent_messages:{receiver_id}'
                await redis_client.rpush(unsent_key, json.dumps(
                    {'sender_id': user_id, 'content': message_content}
                ))
                print(f'Added message to Redis key: {unsent_key}')

    except WebSocketDisconnect:
        websocket_pool.disconnect(user_id, websocket)


@http_router.get('/users/{tg_username}')
async def get_user_by_tg_username_for_bot(
    tg_username: str,
    db: Session = Depends(get_db)
):
    user = await get_user_by_tg_username(db, tg_username)
    return user


@http_router.post('/users/{tg_username}/subscribe')
async def set_is_subscribed(
    tg_username: str,
    chat_id_request: ChatIdRequest,
    db: Session = Depends(get_db)
):
    user = await get_user_by_tg_username(db, tg_username)
    subscribe_user_to_tgbot(db, user, chat_id_request.chat_id)
    return user


@http_router.get('/users', response_model=List[UserBase])
async def get_all_subscribed_users(db: Session = Depends(get_db)):
    return get_subscribed_users(db)
