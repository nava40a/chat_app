import json
import redis.asyncio as aioredis

from fastapi import (APIRouter,
                     Depends,
                     HTTPException,
                     status,
                     WebSocket,
                     WebSocketDisconnect,
                     Query)
from sqlalchemy.orm import Session
from typing import List

from .database import get_db
from .models import User
from .schemas import (UserCreate,
                      UserLogin,
                      MessageBase,
                      UserBase,
                      ChatIdRequest,
                      UserLoginResponse)
from .crud import (create_user,
                   update_user_token,
                   save_message,
                   get_messages_history,
                   get_current_user,
                   get_user_by_tg_username,
                   subscribe_user_to_tgbot,
                   get_subscribed_users,
                   get_all_users,
                   get_user_info_by_id)
from .utils import verify_password, send_message
from .websocket_manager import WebSocketPool


http_router = APIRouter()
ws_router = APIRouter()
redis_client = aioredis.from_url('redis://redis:6379')
websocket_pool = WebSocketPool()


@http_router.post('/api/registration', response_model=UserLoginResponse)
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

    # Проверка, существует ли пользователь с таким ником в телеге
    existing_tg_user = db.query(User).filter(
        User.tg_username == user.tg_username
    ).first()
    if existing_tg_user:
        raise HTTPException(
            status_code=400,
            detail=(
                f'Этот Telegram ник уже используется. '
                'Пожалуйста, укажите другой.'
            )
        )

    new_user = create_user(db, user)
    return new_user


@http_router.post('/api/login', response_model=UserLoginResponse)
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

    return updated_user


@http_router.get(
        '/api/messages/{receiver_id}',
        response_model=List[MessageBase]
    )
async def read_messages_history(
    receiver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    
):
    """Просмотр истории сообщений."""

    sender_id = current_user.id
    return get_messages_history(db, sender_id, receiver_id)


@ws_router.websocket('/api/ws/{user_id}')
async def handle_websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    db: Session = Depends(get_db),
):
    headers = websocket.scope.get('headers')
    print(f"Headers при подключении пользователя {user_id}: {headers}")

    # Подключение пользователя
    await websocket_pool.connect(websocket, user_id)
    await websocket_pool.notify_user_status(user_id, 'online')

    # Проверка наличия в редисе недоставленных сообщений
    unsent_key = f'unsent_messages:{user_id}'
    unsent_messages = await redis_client.lrange(unsent_key, 0, -1)

    # Досылка при их наличии
    for message in unsent_messages:
        message_data = json.loads(message)
        try:
            await websocket.send_text(json.dumps(message_data))
        except RuntimeError as e:
            print(f"Ошибка при отправке сообщения через WebSocket: {e}")
            break
    await redis_client.delete(unsent_key)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Обработка обновления статуса пользователя
            if message.get('type') == 'status_update':
                status_user_id = message['user_id']
                status = message['status']
                await websocket_pool.notify_user_status(status_user_id, status)
                continue

            # Обработка отправки сообщений
            receiver_id = message['receiver_id']
            message_content = message['content']
            save_message(db, user_id, receiver_id, message_content)

            if receiver_id in websocket_pool.connections:
                message_data = {
                    'sender_id': user_id,
                    'receiver_id': receiver_id,
                    'content': message_content
                }
                try:
                    await send_message(
                        receiver_id,
                        json.dumps(message_data),
                        websocket_pool
                    )
                except RuntimeError as e:
                    print(f"Ошибка отправки сообщения пользователю {receiver_id}: {e}")
            else:
                # Если получатель оффлайн, сохраняем сообщение в Redis
                unsent_key = f'unsent_messages:{receiver_id}'
                await redis_client.rpush(unsent_key, json.dumps({
                    'sender_id': user_id,
                    'receiver_id': receiver_id,
                    'content': message_content
                }))
                print(f'Пользователь {receiver_id} не в сети. Сообщение сохранено в Redis')

    except WebSocketDisconnect:
        print(f'Пользователь {user_id} отключился')
        await websocket_pool.disconnect(user_id, websocket)

    except Exception as e:
        print(f"Ошибка в WebSocket-соединении с пользователем {user_id}: {e}")
        await websocket_pool.disconnect(user_id, websocket)

    except RuntimeError as e:
        print(f"Ошибка при обновлении статуса пользователя {user_id}: {e}")
        await websocket.close()


@http_router.post('/api/subscriptions/{tg_username}')
async def set_is_subscribed(
    tg_username: str,
    chat_id_request: ChatIdRequest,
    db: Session = Depends(get_db)
):
    """Подписать пользователя на бота."""

    user = await get_user_by_tg_username(db, tg_username)
    subscribe_user_to_tgbot(db, user, chat_id_request.chat_id)
    return user

 
@http_router.get('/api/users', response_model=List[UserBase])
async def get_users(
    db: Session = Depends(get_db),
    subscribed: bool = Query(False)
):
    """Получение списка пользователей."""

    # Отфильтрованные по подписке пользователи (для бота)
    if subscribed:
        return get_subscribed_users(db)

    # Вернуть список всех пользователей
    else:
        return get_all_users(db)


@http_router.get('/api/users/{user_id}', response_model=UserBase)
def get_user_info(user_id: int, db: Session = Depends(get_db)):
    """Получение информации о пользователе."""

    return get_user_info_by_id(user_id, db)


@http_router.get('/api/user/{tg_username}', response_model=UserBase)
async def get_user_by_tg_username_for_bot(
    tg_username: str,
    db: Session = Depends(get_db)
):
    """Получение ботом пользователя по имени в телеге."""

    return await get_user_by_tg_username(db, tg_username)
