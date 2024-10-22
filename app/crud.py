import concurrent.futures

from sqlalchemy.orm import Session
from typing import List
from fastapi import Header, Depends, HTTPException, status

from .models import User, Message
from .schemas import UserCreate
from .auth import get_hashed_password
from .utils import create_token
from .database import get_db


def create_user(db: Session, user: UserCreate) -> User:
    """Создание пользователя."""

    # Хеширование пароля
    hashed_password = get_hashed_password(user.password)
    auth_token = create_token()

    new_user = User(
        username=user.username,
        hashed_password=hashed_password,
        auth_token=auth_token,
        tg_username=user.tg_username
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def update_user_token(db: Session, user: User) -> User:
    """Обновление токена пользователя."""

    new_auth_token = create_token()
    user.auth_token = new_auth_token

    db.commit()
    db.refresh(user)
    return user


def validate_token(token: str, user_id: int, db: Session) -> bool:
    """Проверка токена."""

    user = db.query(User).filter(User.auth_token == token).first()
    return (user and user.id == user_id)


def save_message(
        db: Session,
        sender_id: int,
        receiver_id: int,
        content: str
    ) -> Message:
    """Сохранение сообщения в базу данных."""

    def save_to_db():

        message = Message(
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        return message

    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(save_to_db)
        return future.result()


def get_messages_history(
        db: Session,
        first_user_id: int,
        second_user_id: int
    ) -> List[Message]:
    """Получение истории сообщений двоих пользователей."""

    messages_history = db.query(Message).filter(
        (
            (Message.sender_id == first_user_id) &
            (Message.receiver_id == second_user_id)
        ) |
        (
            (Message.sender_id == second_user_id) &
            (Message.receiver_id == first_user_id)
        )).order_by(Message.created_at.asc()).all()

    return messages_history


def get_current_user(
        authorization: str = Header(...),
        db: Session = Depends(get_db)
    ) -> User:
    """Получение текущего пользователя."""

    token = authorization.split(' ')[1]
    user = db.query(User).filter(User.auth_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Неверный токен'
        )
    return user


async def get_user_by_tg_username(db: Session, tg_username: str) -> User:
    """Получение пользователя по нику в телеграм."""

    user = db.query(User).filter(User.tg_username == tg_username).first()
    return user


def subscribe_user_to_tgbot(db: Session, user: User, chat_id: int) -> User:
    """Подписать пользователя на бота."""

    user.is_subscribed_to_bot = True
    user.tg_chat_id = chat_id
    db.commit()
    db.refresh(user)
    return user


def get_subscribed_users(db: Session) -> List[User]:
    """Получить список пользователей, подписанных на бота."""

    def query_subscribed_users(db: Session) -> List[User]:
        return db.query(User).filter(User.is_subscribed_to_bot == True).all()

    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(query_subscribed_users, db)
        return future.result()


def get_users(db: Session) -> List[User]:
    """Получить список всех пользователей."""

    def query_all_users(db: Session) -> List[User]:
        return db.query(User).all()

    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(query_all_users, db)
        return future.result()


def get_user_info_by_id(user_id: int, db: Session) -> User:
    """Получение информации о пользователе по его id."""

    return db.query(User).filter(User.id == user_id).first()
