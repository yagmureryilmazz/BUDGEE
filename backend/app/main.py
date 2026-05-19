from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException
from dotenv import load_dotenv
import logging
import os

# .env dosyasını yükle
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("budgee")

logger.info("OPENAI KEY FOUND: %s", bool(os.getenv("OPENAI_API_KEY")))

import app.models
from app.db.base import Base
from app.db.session import engine
from app.api.router import api_router
from app.api.routes.ocr import router as ocr_router

app = FastAPI(
    title="BUDGEE API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://10.24.19.107:3000",
).split(",")

cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

for local_origin in [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://10.24.19.107:3000",
]:
    if local_origin not in cors_origins:
        cors_origins.append(local_origin)

logger.info("CORS ORIGINS: %s", cors_origins)

# Development CORS: allow local web origins explicitly.
# This keeps Safari/Chrome from hiding backend errors behind CORS failures.
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|10\.24\.19\.107):3000",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(api_router)
app.include_router(ocr_router)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(
        "HTTP error | status=%s | path=%s | detail=%s",
        exc.status_code,
        request.url.path,
        exc.detail,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "path": request.url.path,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        "Validation error | path=%s | errors=%s",
        request.url.path,
        exc.errors(),
    )

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Validation failed",
            "details": str(exc.errors()),
            "path": request.url.path,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error | path=%s", request.url.path)

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc) or "Internal server error",
            "path": request.url.path,
        },
    )


@app.get("/")
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "BUDGEE API",
        "version": "0.1.0",
    }


@app.get("/health/db")
def health_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "db": "ok",
        }
    except Exception:
        logger.exception("Database health check failed")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "db": "failed",
            },
        )