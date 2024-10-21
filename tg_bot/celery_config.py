from celery import Celery
from datetime import timedelta


celery_app = Celery(
    'tg_bot',
    broker='redis://redis:6379/0',
    backend='redis://redis:6379/0'
)

celery_app.autodiscover_tasks(['tg_bot'])

celery_app.conf.beat_schedule = {
    'check_messages': {
        'task': 'tasks.check_and_notify',
        'schedule': timedelta(seconds=10),
    }
}
if __name__ == "__main__":
    celery_app.start()