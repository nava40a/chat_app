import asyncio, requests

from redis import Redis

from tg_bot.celery_config import celery_app


API_URL = 'http://app:8000'
redis_client = Redis(host='redis', port=6379, db=0)

last_message_count = {}


def get_subscribed_users():
    """Получение списка подписанных на бота пользователей."""

    response = requests.get(f'{API_URL}/users?subscribed=true')
    return response.json()


@celery_app.task
def check_and_notify():
    """Проверка наличия в Redis недоставленных сообщений
    и отправка уведомления в бот."""

    from tg_bot.main import bot

    subscribed_users = get_subscribed_users()

    for user in subscribed_users:
        messages_key = f'unsent_messages:{user["id"]}'
        messages_count = redis_client.llen(messages_key)

        # Запись значения, если оно отсутствует
        if user['id'] not in last_message_count:
            last_message_count[user['id']] = messages_count

        # Проверка, изменилось ли количество сообщений
        if (
            messages_count > 0 and
            messages_count != last_message_count[user['id']]
        ):
            last_message_count[user['id']] = messages_count
            try:
                loop = asyncio.get_event_loop()
                loop.run_until_complete(bot.send_message(
                    chat_id=user['tg_chat_id'],
                    text=f'Непрочитанных сообщений: {messages_count}'
                ))

                # Обновление количества сообщений после отправки уведомления
                last_message_count[user['id']] = messages_count
            except Exception as e:
                print(f'Ошибка при отправке сообщения: {e}')
