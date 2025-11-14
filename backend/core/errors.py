
"""
- Defines lightweight application errors (AppError).
- Installs a FastAPI exception handler to return clean JSON.
- Lets services raise AppError instead of raw HTTPException.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    # represent a business error with a message and status code
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code


# install the AppError handler on the app
def install_error_handlers(app: FastAPI) -> None:
    # handle AppError and return JSON
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})
