"""Add package publishing schedule.

Revision ID: 20261108_04
Revises: 20261108_03
"""
from alembic import op
import sqlalchemy as sa

revision = "20261108_04"
down_revision = "20261108_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("packages", sa.Column("scheduled_publish_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_packages_scheduled_publish_at", "packages", ["scheduled_publish_at"])


def downgrade() -> None:
    op.drop_index("ix_packages_scheduled_publish_at", table_name="packages")
    op.drop_column("packages", "scheduled_publish_at")
