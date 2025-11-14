"""
- FastAPI dependencies for DB access and authentication/authorization.
- Updated to stop reading role/actor from the JWT and instead always load the account from the database.
- Role-based guards (super-admin, admin, user) now rely 100% on the live DB role.
"""

from typing import Generator, Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from core.db import SessionLocal
from core.security import decode_access_token
from models.account import Account, AccountStatus


# single-line comment: Yield a database session for the duration of the request.
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# single-line comment: Load an account by id and ensure it is active.
def _load_account(db: Session, account_id: int) -> Account:
    acct = db.get(Account, account_id)
    if not acct:
        raise HTTPException(status_code=401, detail="Account not found")
    if acct.status != AccountStatus.active:
        raise HTTPException(status_code=403, detail=f"Account not active (status={acct.status.value})")
    return acct


# single-line comment: Decode bearer token, read user id, load account from DB, and return essential info including role.
def get_current_account(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token payload (missing sub)")
    try:
        sub_id = int(sub)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token subject")
    acct = _load_account(db, sub_id)
    return {
        "id": acct.id,
        "email": acct.email,
        "name": acct.name,
        "role": acct.role.value,   # ← live from DB
        "logo_url": acct.logo_url,
    }


# single-line comment: Guard that only allows super-admin accounts.
def require_super_admin(current=Depends(get_current_account)):
    if current["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin only")
    return current


# single-line comment: Guard that only allows admin accounts.
def require_admin(current=Depends(get_current_account)):
    if current["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return current


# single-line comment: Guard that allows either regular users or admins.
def require_user_or_admin(current=Depends(get_current_account)):
    if current["role"] not in ("user", "admin"):
        raise HTTPException(status_code=403, detail="User or admin only")
    return current
