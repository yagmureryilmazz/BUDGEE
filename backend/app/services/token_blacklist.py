from app.core.redis_client import get_redis

BLACKLIST_PREFIX = "blacklist:jti:"

def blacklist_jti(jti: str, ttl_seconds: int) -> None:
    r = get_redis()
    key = f"{BLACKLIST_PREFIX}{jti}"
    r.set(key, "1", ex=ttl_seconds)

def is_blacklisted(jti: str) -> bool:
    r = get_redis()
    key = f"{BLACKLIST_PREFIX}{jti}"
    return r.exists(key) == 1
