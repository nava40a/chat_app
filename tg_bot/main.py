import os, asyncio, aiohttp, logging, requests

from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command

#from tg_bot.tasks import check_and_notify
from tg_bot.celery_config import celery_app

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')
API_URL = 'http://app:8000'

bot = Bot(token=TELEGRAM_TOKEN)
dp = Dispatcher()


async def get_user_by_tg_username(tg_username):
    async with aiohttp.ClientSession() as session:
        async with session.get(f'{API_URL}/users/{tg_username}') as response:
            if response.status == 404:
                return
            return await response.json()


async def subscribe_user(tg_username, chat_id):
    async with aiohttp.ClientSession() as session:
        data = {'chat_id': chat_id}
        async with session.post(f'{API_URL}/users/{tg_username}/subscribe', json=data) as response:
            if response.status == 404:
                return
            return await response.json()


#async def get_subscribed_users():
#    async with aiohttp.ClientSession() as session:
#        async with session.get(f'{API_URL}/users') as response:
#            if response.status == 404:
#                return
#            return await response.json()

def get_subscribed_users():
    response = requests.get(f'{API_URL}/users')
    return response.json()



@dp.message(Command('start'))
async def say_hello(message: types.Message):
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
    #celery_app.send_task('tasks.check_and_notify')
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
