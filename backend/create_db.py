"""
- Script to be run once at project start.
- Ensures the Postgres database exists (creates it if missing).
- Creates all SQLAlchemy tables from models.
- Seeds the first super-admin account from .env, INCLUDING its local auth identity (and adds the identity if the account already exists but somehow lacks one).
"""

import psycopg2
import psycopg2.extensions
from sqlalchemy import create_engine, select
from sqlalchemy.engine import Engine

from core.settings import settings
from core.db import Base, SessionLocal
import models  # noqa: F401
from models.account import Account, AccountRole, AccountStatus
from core.security import hash_password
from crud.auth_identities import create_identity_for_account, get_identity_by_provider_account


# single-line comment: Create the target database itself if it does not already exist.
def _create_db_if_not_exists() -> None:
    dsn_root = (
        f"dbname=postgres user={settings.DB_USER} password={settings.DB_PASSWORD} "
        f"host={settings.DB_HOST} port={settings.DB_PORT}"
    )
    conn = psycopg2.connect(dsn_root)
    conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", (settings.DB_NAME,))
    exists = cur.fetchone()
    if not exists:
        cur.execute(f'CREATE DATABASE "{settings.DB_NAME}"')
    cur.close()
    conn.close()


# single-line comment: Create all SQLAlchemy tables against the configured database.
def _create_tables() -> None:
    engine: Engine = create_engine(settings.database_url(), future=True)
    Base.metadata.create_all(bind=engine)


# single-line comment: Ensure there is exactly one super-admin and that it has a local login identity.
def _seed_super_admin() -> None:
    db = SessionLocal()
    try:
        email = settings.SUPER_ADMIN_EMAIL.strip().lower()
        row = db.execute(select(Account).where(Account.email == email)).scalar_one_or_none()
        if row:
            # existing super admin account → make sure there is at least one local identity
            ident = get_identity_by_provider_account(db, "local", email)
            if not ident:
                create_identity_for_account(
                    db,
                    account_id=row.id,
                    provider="local",
                    provider_account_id=email,
                    password_hash=hash_password(settings.SUPER_ADMIN_PASSWORD),
                )
                db.commit()
            return

        # 1) create the account (no password fields here)
        sa = Account(
            email=email,
            name=settings.SUPER_ADMIN_NAME or "Super Admin",
            role=AccountRole.super_admin,
            status=AccountStatus.active,
        )
        db.add(sa)
        db.commit()
        db.refresh(sa)

        # 2) create local identity for login
        create_identity_for_account(
            db,
            account_id=sa.id,
            provider="local",
            provider_account_id=email,
            password_hash=hash_password(settings.SUPER_ADMIN_PASSWORD),
        )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    _create_db_if_not_exists()
    _create_tables()
    _seed_super_admin()
    print("Database and tables created, super admin seeded.")
