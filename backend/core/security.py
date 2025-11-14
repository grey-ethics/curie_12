"""
- Remove role/actor from JWT payloads so tokens only carry user id (sub) and standard claims.
- Keep refresh tokens carrying only sub + jti so we can track/revoke sessions in auth_sessions.
- Downstream code (deps/guards) must always load the account from the database to know the current role.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Tuple
import uuid
import hmac

import jwt
from passlib.context import CryptContext
from fastapi import Response, HTTPException, status, Request

from core.settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# single-line comment: Hash a plain-text password using passlib.
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# single-line comment: Verify a plain-text password against a stored hash.
def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


# single-line comment: Create a short-lived access JWT that only includes the subject (user id) and standard claims.
def create_access_token(sub: int, extra: Dict[str, Any] | None = None) -> Tuple[str, int]:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    payload: Dict[str, Any] = {
        "iss": "poc-backend",
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "sub": str(sub),
        **(extra or {}),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    return token, settings.ACCESS_TOKEN_MINUTES * 60


# single-line comment: Create a long-lived refresh JWT that only includes subject (user id) and a unique jti for revocation.
def create_refresh_token(
    sub: int,
    jti: str | None = None,
    extra: Dict[str, Any] | None = None,
):
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=settings.REFRESH_TOKEN_DAYS)
    jti = jti or str(uuid.uuid4())
    payload: Dict[str, Any] = {
        "iss": "poc-backend",
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "sub": str(sub),
        "jti": jti,
        **(extra or {}),
    }
    token = jwt.encode(payload, settings.JWT_REFRESH_SECRET, algorithm="HS256")
    return token, jti, exp


# single-line comment: Decode and validate an access token using the access secret.
def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")


# single-line comment: Decode and validate a refresh token using the refresh secret.
def decode_refresh_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_REFRESH_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")


# single-line comment: Set HTTP-only refresh and non-HTTP-only CSRF cookies so the client can refresh sessions.
def set_refresh_cookies(response: Response, refresh_token: str, csrf_token: str, expires_at: datetime) -> None:
    max_age = int((expires_at - datetime.now(timezone.utc)).total_seconds())
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/auth",
        max_age=max_age,
        expires=expires_at,
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
        max_age=max_age,
        expires=expires_at,
    )


# single-line comment: Verify X-CSRF-Token header against the stored csrf_token cookie.
def verify_csrf(request: Request) -> None:
    header = request.headers.get("X-CSRF-Token")
    cookie = request.cookies.get("csrf_token")
    if not header or not cookie or not hmac.compare_digest(header, cookie):
        raise HTTPException(status_code=403, detail="CSRF validation failed")
