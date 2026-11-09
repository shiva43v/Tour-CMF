"""Record fixed enquiry acknowledgements.

Revision ID: 20261108_05
Revises: 20261108_04
"""
from alembic import op
import sqlalchemy as sa

revision = "20261108_05"
down_revision = "20261108_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("enquiries", sa.Column("acknowledgement_message", sa.Text(), nullable=True))
    op.add_column("enquiries", sa.Column("acknowledgement_status", sa.String(length=30), nullable=False, server_default="recorded"))


def downgrade() -> None:
    op.drop_column("enquiries", "acknowledgement_status")
    op.drop_column("enquiries", "acknowledgement_message")
