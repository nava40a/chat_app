from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, BOOLEAN
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    auth_token = Column(String, unique=True, index=True)
    tg_username = Column(String, unique=True, index=True)
    tg_chat_id = Column(Integer, unique=True, index=True)
    is_subscribed_to_bot = Column(BOOLEAN, default=False)


class Message(Base):
    __tablename__ = 'messages'

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey('users.id'))
    receiver_id = Column(Integer, ForeignKey('users.id'))
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship('User', foreign_keys=[sender_id])
    receiver = relationship('User', foreign_keys=[receiver_id])
