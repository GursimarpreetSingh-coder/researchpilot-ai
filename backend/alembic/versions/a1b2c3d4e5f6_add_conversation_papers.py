"""add multi-paper conversation associations

Revision ID: a1b2c3d4e5f6
Revises: 9ca3dbdf7e1a
Create Date: 2026-09-07 22:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "9ca3dbdf7e1a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "conversation_papers",
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("paper_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["paper_id"], ["papers.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("conversation_id", "paper_id"),
    )
    op.create_index(
        "ix_conversation_papers_paper_id",
        "conversation_papers",
        ["paper_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_conversation_papers_paper_id",
        table_name="conversation_papers",
    )
    op.drop_table("conversation_papers")
