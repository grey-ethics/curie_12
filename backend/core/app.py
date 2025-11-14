"""
- Builds the FastAPI app.
- Installs CORS, error handlers, static mount.
- Includes all routers (auth, profile, chat, super-admin, admin RAG, tools*).
- Performs DB + OpenAI startup checks.
- ✅ Now mounts /static using services.data_storage_service.get_storage_root() so storage is defined in ONE place.
"""

import logging

from fastapi import FastAPI
from starlette.staticfiles import StaticFiles
from sqlalchemy import text, inspect

from core.middleware import install_cors
from core.errors import install_error_handlers
from core.settings import settings
from core.db import engine
from services.data_storage_service import get_storage_root

# import routers
from api.auth import router as auth_router
from api.profile import router as profile_router
from api.accounts import router as accounts_router
from api.rag_documents import router as rag_router
from api.chat import router as chat_router
from api.tools import router as tools_router

log = logging.getLogger("uvicorn.error")


# single-line comment: On startup, check database connectivity and warn about missing tables.
def _startup_db_check() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            insp = inspect(conn)
            tables = set(insp.get_table_names())
        required = {
            "accounts",
            "auth_identities",
            "auth_sessions",
            "chat_sessions",
            "chat_messages",
            "chat_tool_invocations",
            "rag_documents",
            "rag_document_chunks",
        }
        missing = required - tables
        if missing:
            log.warning("DB connected but missing tables: %s (run create_db.py)", sorted(missing))
        else:
            log.info("DB connected and required tables exist.")
    except Exception as e:
        log.exception("DB connection failed on startup: %s", e)


# single-line comment: On startup, hit OpenAI once to make sure the key works.
def _startup_openai_check() -> None:
    try:
        from core.openai_client import get_client

        cl = get_client()
        _ = cl.models.list()
        log.info("OpenAI connected ✅")
    except Exception as e:
        log.exception("OpenAI check failed: %s", e)


# single-line comment: Build and return the FastAPI application.
def create_app() -> FastAPI:
    app = FastAPI(title="POC Chat Backend", version="1.0.0")

    install_cors(app)

    # include routers
    app.include_router(auth_router, prefix="/auth", tags=["auth"])
    app.include_router(profile_router, prefix="/profile", tags=["profile"])
    app.include_router(chat_router, prefix="/chat", tags=["chat"])
    app.include_router(accounts_router, prefix="/super-admin/accounts", tags=["super-admin"])
    app.include_router(rag_router, prefix="/admin/rag-documents", tags=["admin-rag"])

    # tools are optional
    if settings.EXPOSE_TOOLS_HTTP:
        app.include_router(tools_router, prefix="/tools", tags=["tools"])

    # static: mount EXACTLY the same directory data_storage_service uses
    app.mount("/static", StaticFiles(directory=str(get_storage_root())), name="static")

    install_error_handlers(app)

    @app.on_event("startup")
    async def _startup():
        _startup_db_check()
        _startup_openai_check()

    return app
