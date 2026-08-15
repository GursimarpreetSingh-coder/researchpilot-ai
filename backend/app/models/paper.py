from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    abstract: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    doi: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
    )

    publication_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    journal: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    pdf_path: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    source: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )