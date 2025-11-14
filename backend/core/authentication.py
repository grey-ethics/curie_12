"""
- Authentication flows for login/register/refresh/logout.
- Updated to issue role-less JWTs (tokens now only carry user id, not role).
- Role is always read from the database at request time, so changes in the DB take effect immediately.
"""

from fastapi import HTTPException, Request, Response
from sqlalchemy.orm import Session

from core.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    set_refresh_cookies,
    decode_refresh_token,
    verify_csrf,
)
from crud.accounts import (
    get_account_by_email,
    create_account,
    get_account_by_id,
)
from crud.auth_identities import (
    create_identity_for_account,
    get_local_password_hash_for_account,
)
from crud.auth_sessions import (
    create_session,
    revoke_session,
    get_session_by_jti,
)
from models.account import AccountStatus, AccountRole


# single-line comment: Issue a fresh access token and refresh token for the given account id and store the refresh session.
def _issue_tokens(
    response: Response,
    db: Session,
    *,
    account_id: int,
    user_agent: str | None,
    ip: str | None,
):
    access, expires_in = create_access_token(sub=account_id)
    refresh, jti, exp_dt = create_refresh_token(sub=account_id)
    create_session(
        db,
        account_id=account_id,
        refresh_jti=jti,
        expires_at=exp_dt,
        user_agent=user_agent,
        ip=ip,
    )
    set_refresh_cookies(response, refresh, csrf_token=jti, expires_at=exp_dt)
    return {"access_token": access, "expires_in": expires_in}


# single-line comment: Normalize emails to a consistent lowercased format.
def _normalize_email(email: str) -> str:
    return email.strip().lower()


# single-line comment: Local-email/password login flow that checks auth_identities and then issues tokens.
def login_local(
    request: Request,
    response: Response,
    db: Session,
    *,
    email: str,
    password: str,
):
    email = _normalize_email(email)
    acct = get_account_by_email(db, email)
    if not acct:
        raise HTTPException(status_code=404, detail="Email not registered")
    if acct.status != AccountStatus.active:
        raise HTTPException(status_code=403, detail=f"Account status is {acct.status.value}")

    pw_hash = get_local_password_hash_for_account(db, acct.id, email)
    if not pw_hash or not verify_password(password, pw_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    return _issue_tokens(response, db, account_id=acct.id, user_agent=ua, ip=ip)


# single-line comment: Register a normal user account (starts as pending) and create its local identity.
def register_user(
    db: Session,
    *,
    email: str,
    password: str,
    name: str | None = None,
):
    email = _normalize_email(email)
    existing = get_account_by_email(db, email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    acct = create_account(
        db,
        email=email,
        name=name,
        role=AccountRole.user,
        status=AccountStatus.pending,
    )

    create_identity_for_account(
        db,
        account_id=acct.id,
        provider="local",
        provider_account_id=email,
        password_hash=hash_password(password),
    )
    return acct


# single-line comment: Register an admin account (starts as pending) and create its local identity.
def register_admin(
    db: Session,
    *,
    email: str,
    password: str,
    name: str | None = None,
):
    email = _normalize_email(email)
    existing = get_account_by_email(db, email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    acct = create_account(
        db,
        email=email,
        name=name,
        role=AccountRole.admin,
        status=AccountStatus.pending,
    )

    create_identity_for_account(
        db,
        account_id=acct.id,
        provider="local",
        provider_account_id=email,
        password_hash=hash_password(password),
    )
    return acct


# single-line comment: Refresh flow that validates CSRF, refresh token, and session, then re-issues session-bound tokens.
def refresh_service(
    request: Request,
    response: Response,
    db: Session,
):
    verify_csrf(request)
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh cookie")
    payload = decode_refresh_token(refresh_token)
    jti = payload.get("jti")
    sub = payload.get("sub")
    if not jti or not sub:
        raise HTTPException(status_code=401, detail="Invalid refresh payload")

    sess = get_session_by_jti(db, jti)
    if not sess or sess.is_revoked():
        raise HTTPException(status_code=401, detail="Session not active")

    try:
        account_id = int(sub)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid subject")

    acct = get_account_by_id(db, account_id)
    if not acct or acct.status != AccountStatus.active:
        raise HTTPException(status_code=403, detail="Account not active")

    # revoke old session and issue new tokens
    revoke_session(db, jti)
    access, expires_in = create_access_token(sub=account_id)
    new_refresh, new_jti, exp_dt = create_refresh_token(sub=account_id)
    create_session(
        db,
        account_id=account_id,
        refresh_jti=new_jti,
        expires_at=exp_dt,
        user_agent=None,
        ip=None,
    )
    set_refresh_cookies(response, new_refresh, csrf_token=new_jti, expires_at=exp_dt)
    return {"access_token": access, "expires_in": expires_in}


# single-line comment: Logout flow that revokes the current refresh session if present.
def logout_service(
    request: Request,
    db: Session,
):
    verify_csrf(request)
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        return
    try:
        payload = decode_refresh_token(refresh_token)
        jti = payload.get("jti")
        if jti:
            revoke_session(db, jti)
    except Exception:
        pass
