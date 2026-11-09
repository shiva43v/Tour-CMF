"""Add AI analysis, recommendations, and reply draft to enquiries.

Revision ID: 20261108_03
Revises: 20261107_02
Create Date: 2026-11-08
"""
from alembic import op
import sqlalchemy as sa

revision = "20261108_03"
down_revision = "20261107_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("enquiries", sa.Column("ai_analysis", sa.JSON(), nullable=True))
    op.add_column("enquiries", sa.Column("ai_recommendations", sa.JSON(), nullable=True))
    op.add_column("enquiries", sa.Column("ai_reply_draft", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("enquiries", "ai_reply_draft")
    op.drop_column("enquiries", "ai_recommendations")
    op.drop_column("enquiries", "ai_analysis")
