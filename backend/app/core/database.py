from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from backend.app.core.config import get_settings
from backend.app.core.security import get_password_hash

settings = get_settings()
connect_args = {'check_same_thread': False} if settings.database_url.startswith('sqlite') else {}
engine = create_engine(settings.database_url, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def repair_sqlite_schema() -> None:
    if not settings.database_url.startswith('sqlite'):
        return

    with engine.begin() as connection:
        user_columns = {row[1] for row in connection.execute(text("PRAGMA table_info('users')"))}
        if 'session_version' not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1"))

        admin_columns = {row[1] for row in connection.execute(text("PRAGMA table_info('admins')"))}
        if 'session_version' not in admin_columns:
            connection.execute(text("ALTER TABLE admins ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1"))


def repair_demo_password_hashes() -> None:
    if not settings.database_url.startswith('sqlite'):
        return

    driver_hash = get_password_hash('Driver@123')
    admin_hash = get_password_hash('Admin@123')

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE users
                SET password_hash = :driver_hash
                WHERE email IN ('driver1@example.com', 'driver2@example.com')
                  AND password_hash = 'argon2-demo-hash'
                """
            ),
            {'driver_hash': driver_hash},
        )
        connection.execute(
            text(
                """
                UPDATE admins
                SET password_hash = :admin_hash
                WHERE email IN ('superadmin@driversafe.local', 'admin@driversafe.local')
                  AND password_hash = 'argon2-demo-hash'
                """
            ),
            {'admin_hash': admin_hash},
        )
