from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.deps import get_db
from app.services.token_blacklist import is_blacklisted
from app.services.users import get_user_by_email

bearer_scheme = HTTPBearer(auto_error=False)


def _decode_and_validate_token(
    creds: HTTPAuthorizationCredentials | None,
) -> dict:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = creds.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    jti = payload.get("jti")
    sub = payload.get("sub")
    if not jti or not sub:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    if is_blacklisted(jti):
        raise HTTPException(status_code=401, detail="Token revoked")

    return payload


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    payload = _decode_and_validate_token(creds)

    user = get_user_by_email(db, payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    return user


def get_current_user_with_payload(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    payload = _decode_and_validate_token(creds)

    user = get_user_by_email(db, payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    return user, payload


def require_admin(result=Depends(get_current_user_with_payload)):
    user, payload = result
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return user, payload
