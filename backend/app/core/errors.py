"""Error responses in RFC 9457 "problem details" format.

Every error the API returns has the same shape, with a stable machine-readable
`code`, so the app can show the right message without parsing English text.
"""

import logging
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

PROBLEM_JSON = "application/problem+json"


class ApiError(Exception):
    """Raise from service code to return a specific error to the client."""

    def __init__(self, status: int, code: str, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.code = code
        self.detail = detail


def problem(status: int, code: str, detail: str, **extra: Any) -> JSONResponse:
    body = {
        "type": "about:blank",
        "title": HTTPStatus(status).phrase,
        "status": status,
        "code": code,
        "detail": detail,
        **extra,
    }
    return JSONResponse(body, status_code=status, media_type=PROBLEM_JSON)


async def _api_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, ApiError)  # noqa: S101 - registered only for ApiError
    return problem(exc.status, exc.code, exc.detail)


async def _http_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)  # noqa: S101
    code = "not_found" if exc.status_code == 404 else HTTPStatus(exc.status_code).name.lower()
    return problem(exc.status_code, code, str(exc.detail))


async def _validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)  # noqa: S101
    errors = [
        {"loc": list(err["loc"]), "msg": err["msg"], "type": err["type"]} for err in exc.errors()
    ]
    return problem(422, "validation_failed", "The request is not valid.", errors=errors)


async def _unhandled_error(_: Request, exc: Exception) -> JSONResponse:
    # Log the details for us; never send internals (stack traces, SQL) to the client.
    logger.exception("Unhandled error", exc_info=exc)
    return problem(500, "internal_error", "Something went wrong. Please try again.")


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, _api_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(Exception, _unhandled_error)
