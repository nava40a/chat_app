from sqlalchemy.orm import Session
from .models import User
from .schemas import UserCreate
from .auth import get_hashed_password


def create_user(db: Session, user: UserCreate) -> User:
    """Создание пользователя."""

    # Хеширование пароля
    hashed_password = get_hashed_password(user.password)

    db_user = User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
