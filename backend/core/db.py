
"""
- Creates the SQLAlchemy engine and session factory.
- Exposes Base for model classes to inherit from.
- Reads DB URL from core.settings.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from core.settings import settings

# create SQLAlchemy engine
engine = create_engine(settings.database_url(), pool_pre_ping=True, future=True)

# create session factory
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# declarative base for all models
Base = declarative_base()
