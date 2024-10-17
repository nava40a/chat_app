from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .schemas import UserCreate, UserLogin
from .crud import create_user
from .utils import verify_password


router = APIRouter()


@router.post('/register')
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Регистрация пользователя."""

    # Проверка, существует ли пользователь с таким именем
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail='Пользователь с таким именем уже зарегистрирован.'
        )

    new_user = create_user(db, user)
    
    return {
        'msg': 'Пользователь успешно зарегистрирован',
        'username': new_user.username
    }


@router.post('/login')
async def login(user: UserLogin, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        User.username == user.username
    ).first()
    
    if not existing_user or not verify_password(
        user.password,
        existing_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Неверное имя пользователя или пароль',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    return {'message': 'Вы успешно авторизованы.'}
