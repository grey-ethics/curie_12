"""
- Authentication HTTP routes exposed under /auth.
- Provides login, user/admin registration, token refresh, and logout.
- Updated so that /auth/login returns token_type="bearer" in addition to access_token and expires_in.
"""

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from core.deps import get_db
from core.authentication import (
    login_local,
    register_user,
    register_admin,
    refresh_service,
    logout_service,
)
from schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    RefreshResponse,
    LogoutResponse,
)

router = APIRouter()


# single-line comment: Internal helper to perform local login and wrap the result into the LoginResponse schema.
def _login(payload: LoginRequest, request: Request, response: Response, db: Session):
    tokens = login_local(request, response, db, email=payload.email, password=payload.password)
    return LoginResponse(
        access_token=tokens["access_token"],
        expires_in=tokens["expires_in"],
        token_type="bearer",
    )


# single-line comment: POST /auth/login → validate credentials, set refresh cookie, return access token and token_type.
@router.post("/login", response_model=LoginResponse)
def login_endpoint(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    return _login(payload, request, response, db)


# single-line comment: POST /auth/register/user → create a pending user account with local credentials.
@router.post("/register/user", response_model=RegisterResponse)
def register_user_endpoint(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    acct = register_user(db, email=payload.email, password=payload.password, name=payload.name)
    return RegisterResponse(id=acct.id, email=acct.email, status=acct.status.value)


# single-line comment: POST /auth/register/admin → create a pending admin account with local credentials.
@router.post("/register/admin", response_model=RegisterResponse)
def register_admin_endpoint(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    acct = register_admin(db, email=payload.email, password=payload.password, name=payload.name)
    return RegisterResponse(id=acct.id, email=acct.email, status=acct.status.value)


# single-line comment: POST /auth/refresh → rotates refresh session and returns a new short-lived access token.
@router.post("/refresh", response_model=RefreshResponse)
def refresh_endpoint(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    tokens = refresh_service(request, response, db)
    return RefreshResponse(access_token=tokens["access_token"], expires_in=tokens["expires_in"])


# single-line comment: POST /auth/logout → revokes the current refresh session using CSRF-protected cookie.
@router.post("/logout", response_model=LogoutResponse)
def logout_endpoint(
    request: Request,
    db: Session = Depends(get_db),
):
    logout_service(request, db)
    return LogoutResponse(success=True)
