import asyncio

from redis import Redis
#from asgiref.sync import async_to_sync

from tg_bot.celery_config import celery_app



redis_client = Redis(host='redis', port=6379, db=0)


@celery_app.task
def check_and_notify():
    """Проверка наличия в Redis недоставленных сообщений
    и отправка уведомления в бот."""
    from tg_bot.main import bot
    from tg_bot.main import get_subscribed_users
    subscribed_users = get_subscribed_users()
    for user in subscribed_users:
        messages_key = f'unsent_messages:{user["id"]}'
        messages_count = redis_client.llen(messages_key)
        if messages_count > 0:
            try:

                loop = asyncio.get_event_loop()
                loop.run_until_complete(bot.send_message(
                    chat_id=user['tg_chat_id'],
                    text=f'Непрочитанных сообщений: {messages_count}'
                ))
            except Exception as e:
                print(f"Ошибка при отправке сообщения: {e}")
