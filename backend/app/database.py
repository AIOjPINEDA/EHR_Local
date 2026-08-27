"""
ConsultaMed Backend - Database Configuration
"""
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

DATABASE_UNAVAILABLE_DETAIL = "Database unavailable"


# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.SQLALCHEMY_ECHO,
    future=True,
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""
    pass


def utcnow() -> datetime:
    """Timezone-aware UTC timestamp for model defaults.

    Every timestamp column is TIMESTAMPTZ. asyncpg encodes a *naive* datetime by
    calling astimezone() on it, which reinterprets the value as machine-local
    time -- so datetime.utcnow() (naive, already UTC) was being shifted back by
    the local UTC offset and stored 1-2 h early on this Europe/Madrid host.
    Returning an aware value makes the encoding unambiguous.
    """
    return datetime.now(timezone.utc)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    try:
        async with async_session_maker() as session:
            try:
                yield session
            finally:
                await session.close()
    except ConnectionRefusedError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=DATABASE_UNAVAILABLE_DETAIL,
        ) from exc
