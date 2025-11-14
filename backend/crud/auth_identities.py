# FILE: crud/auth_identities.py
"""
- CRUD for auth_identities table.
- Used for local login and for potential future OAuth.
- Now also exposes a helper to update the password hash on an existing identity.
"""

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from models.auth_identity import AuthIdentity


# single-line comment: Get identity row for a provider + provider-specific account id (e.g. local + email).
def get_identity_by_provider_account(db: Session, provider: str, provider_account_id: str) -> Optional[AuthIdentity]:
    return (
        db.execute(
            select(AuthIdentity).where(
                AuthIdentity.provider == provider, AuthIdentity.provider_account_id == provider_account_id
            )
        )
        .scalars()
        .first()
    )


# single-line comment: Create a new identity row for an account.
def create_identity_for_account(
    db: Session,
    *,
    account_id: int,
    provider: str,
    provider_account_id: str,
    password_hash: str | None,
) -> AuthIdentity:
    ident = AuthIdentity(
        account_id=account_id,
        provider=provider,
        provider_account_id=provider_account_id,
        password_hash=password_hash,
    )
    db.add(ident)
    db.commit()
    db.refresh(ident)
    return ident


# single-line comment: Get the local password hash for an account (returns None if identity is missing or belongs to another account).
def get_local_password_hash_for_account(db: Session, account_id: int, email: str) -> Optional[str]:
    ident = get_identity_by_provider_account(db, "local", email)
    if not ident or ident.account_id != account_id:
        return None
    return ident.password_hash


# single-line comment: Update the password_hash of an existing identity and persist it.
def update_identity_password_hash(db: Session, identity: AuthIdentity, *, password_hash: str) -> AuthIdentity:
    identity.password_hash = password_hash
    db.add(identity)
    db.commit()
    db.refresh(identity)
    return identity
