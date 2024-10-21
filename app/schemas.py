from pydantic import BaseModel, ConfigDict
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    password: str
    tg_username: str


class UserLogin(BaseModel):
    username: str
    password: str


class MessageBase(BaseModel):
    sender_id: int
    receiver_id: int
    content: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class UserBase(BaseModel):
    id: int
    username: str
    tg_chat_id: int
    is_subscribed_to_bot: bool 

    model_config = ConfigDict(
        from_attributes=True
    )


class ChatIdRequest(BaseModel):
    chat_id: int