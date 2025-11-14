"""
- Houses app-wide middleware installers.
- Now a bit more dev-friendly: always allow localhost / 127.0.0.1 on any port.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.settings import settings


def install_cors(app: FastAPI) -> None:
    # normalize to list
    origins = settings.CORS_ORIGINS
    if isinstance(origins, str):
        origins = [origins]

    # In dev we very often hit http://127.0.0.1:5173 or another port.
    # allow_origin_regex works together with allow_origins.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        # accept localhost/127.0.0.1 on *any* port
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
