from datetime import datetime, timedelta, timezone
from uuid import uuid4

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return _pwd_context.verify(password, hashed_password)


def create_access_token(subject: str, minutes: int | None = None) -> tuple[str, str]:
    """
    subject: genelde user.email veya user_id string.
    return: (token, jti)
    """
    expire_minutes = minutes if minutes is not None else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expire_minutes)

    jti = str(uuid4())
    payload = {
        "sub": subject,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": exp,
        "type": "access",
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)
    return token, jti


def create_reset_token(subject: str, minutes: int = 15) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=minutes)

    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": exp,
        "type": "password_reset",
    }

    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)
    return token


def verify_reset_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])

        token_type = payload.get("type")
        subject = payload.get("sub")

        if token_type != "password_reset":
            return None

        if not subject:
            return None

        return str(subject)
    except JWTError:
        return None


def create_email_verification_token(subject: str, minutes: int = 60) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=minutes)

    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": exp,
        "type": "email_verification",
    }

    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)
    return token


def verify_email_verification_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])

        token_type = payload.get("type")
        subject = payload.get("sub")

        if token_type != "email_verification":
            return None

        if not subject:
            return None

        return str(subject)
    except JWTError:
        return None