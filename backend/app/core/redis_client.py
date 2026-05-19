import redis
from app.core.config import settings

def get_redis() -> redis.Redis:
    # decode_responses=True => str döner
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
