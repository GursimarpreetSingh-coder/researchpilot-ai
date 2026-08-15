"""add persisted chat sources

Revision ID: 9ca3dbdf7e1a
Revises: 4ebbb85f68d5
Create Date: 2026-08-13 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9ca3dbdf7e1a"
down_revision: Union[str, Sequence[str], None] = "4ebbb85f68d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("sources", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "sources")
