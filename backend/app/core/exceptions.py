"""
Custom exception classes and FastAPI exception handlers.

Provides structured error responses with consistent format:
{"detail": "message", "code": "ERROR_CODE"}
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Base application exception with HTTP status code and error code."""

    def __init__(
        self,
        detail: str,
        code: str = "APP_ERROR",
        status_code: int = 400,
    ):
        self.detail = detail
        self.code = code
        self.status_code = status_code
        super().__init__(detail)


class NotFoundException(AppException):
    """Resource not found (404)."""

    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail=detail, code="NOT_FOUND", status_code=404)


class ConflictException(AppException):
    """Duplicate or conflicting resource (409)."""

    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(detail=detail, code="CONFLICT", status_code=409)


class ForbiddenException(AppException):
    """Insufficient permissions (403)."""

    def __init__(self, detail: str = "Forbidden"):
        super().__init__(detail=detail, code="FORBIDDEN", status_code=403)


class ValidationException(AppException):
    """Business rule validation failed (422)."""

    def __init__(self, detail: str = "Validation error"):
        super().__init__(detail=detail, code="VALIDATION_ERROR", status_code=422)


class InsufficientStockException(AppException):
    """Not enough stock to fulfill the order (409)."""

    def __init__(self, detail: str = "Insufficient stock"):
        super().__init__(detail=detail, code="INSUFFICIENT_STOCK", status_code=409)


def register_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers on the FastAPI app."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "code": exc.code},
        )
