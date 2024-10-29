import os, asyncio, aiohttp, logging

from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command


logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')
API_URL = 'http://app:8000/api'

bot = Bot(token=TELEGRAM_TOKEN)
dp = Dispatcher()


async def get_user_by_tg_username(tg_username):
    """Получение пользователя по нику в телеге."""

    async with aiohttp.ClientSession() as session:
        async with session.get(f'{API_URL}/user/{tg_username}') as response:
            return await response.json()


async def subscribe_user(tg_username, chat_id):
    """Подписать пользователя на бота."""

    async with aiohttp.ClientSession() as session:
        data = {'chat_id': chat_id}
        async with session.post(
            f'{API_URL}/subscriptions/{tg_username}', json=data
        ) as response:
            if response.status == 404:
                return
            return await response.json()


@dp.message(Command('start'))
async def say_hello(message: types.Message):
    """Первичный контакт с ботом."""

    tg_username = message.from_user.username
    chat_id = message.chat.id
    user = await get_user_by_tg_username(tg_username)

    if user:
        await bot.send_message(chat_id, f'Привет, {user["username"]}!')
        if not user['is_subscribed_to_bot']:
            await subscribe_user(tg_username, chat_id)
            await bot.send_message(chat_id, 'Вы подписаны на уведомления.')
    else:
        await bot.send_message(chat_id, 'Пользователь не найден.')


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
