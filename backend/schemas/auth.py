"""
- Pydantic models for authentication-related endpoints.
- Used by /auth/login, /auth/register/*, /auth/refresh, /auth/logout.
- Updated to make /auth/login return token_type="bearer" so the frontend knows how to use the token.
"""

from pydantic import BaseModel, EmailStr


# single-line comment: Request body for logging in with email/password against the local provider.
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# single-line comment: Response body for successful login, now also includes token_type="bearer".
class LoginResponse(BaseModel):
    access_token: str
    expires_in: int
    token_type: str = "bearer"


# single-line comment: Request body for registering either a user or an admin (endpoint decides role).
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


# single-line comment: Response body after a successful registration.
class RegisterResponse(BaseModel):
    id: int
    email: EmailStr
    status: str


# single-line comment: Response body for /auth/refresh which issues a fresh access token.
class RefreshResponse(BaseModel):
    access_token: str
    expires_in: int


# single-line comment: Response body for /auth/logout to indicate success.
class LogoutResponse(BaseModel):
    success: bool
