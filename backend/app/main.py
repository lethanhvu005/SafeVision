from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from backend.app.api.router import router
from backend.app.core.config import get_settings
from backend.app.core.database import Base, engine, repair_demo_password_hashes, repair_sqlite_schema
from backend.app.core.logging import configure_logging

settings = get_settings()
configure_logging()
Base.metadata.create_all(bind=engine)
repair_sqlite_schema()
repair_demo_password_hashes()

app = FastAPI(title=settings.app_name)
allowed_origins = list(
    dict.fromkeys(
        [
            settings.frontend_origin,
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:4173',
            'http://127.0.0.1:4173',
        ]
    )
)
origin_regex = None
if settings.app_env == 'development':
    origin_regex = (
        r'https?://('
        r'(localhost|127\.0\.0\.1)'
        r'|10\.\d+\.\d+\.\d+'
        r'|192\.168\.\d+\.\d+'
        r'|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+'
        r')(:\d+)?$'
    )
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
)


@app.middleware('http')
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(self), geolocation=(self), microphone=()'
    response.headers['Cache-Control'] = 'no-store'
    if request.url.scheme == 'https':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    csp = "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https:; media-src 'self' blob:; frame-ancestors 'none'"
    response.headers['Content-Security-Policy'] = csp
    return response


app.include_router(router, prefix=settings.api_v1_prefix)


@app.get('/')
def root() -> dict[str, str]:
    return {'message': settings.app_name}
