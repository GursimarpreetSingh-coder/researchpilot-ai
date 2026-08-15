from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PaperSummary(Base):
    __tablename__ = "paper_summaries"

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    paper_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("papers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    key_contributions: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    methodology: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    limitations: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )