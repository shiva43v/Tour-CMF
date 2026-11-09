"""Add Phase 5 enquiry workflow fields."""
from alembic import op
import sqlalchemy as sa

revision = "20261107_02"
down_revision = "20261106_01"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("enquiries", sa.Column("package_version_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_enquiries_package_version", "enquiries", "package_versions", ["package_version_id"], ["id"])
    op.add_column("enquiries", sa.Column("adults", sa.Integer(), nullable=True))
    op.add_column("enquiries", sa.Column("children", sa.Integer(), nullable=True))
    op.add_column("enquiries", sa.Column("travel_dates", sa.String(120), nullable=True))
    op.add_column("enquiries", sa.Column("budget", sa.String(80), nullable=True))
    op.add_column("enquiries", sa.Column("reference", sa.String(40), nullable=True))
    op.create_unique_constraint("uq_enquiries_reference", "enquiries", ["reference"])
    op.create_table("enquiry_notes", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("enquiry_id", sa.Integer(), sa.ForeignKey("enquiries.id", ondelete="CASCADE"), nullable=False), sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("body", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_enquiry_notes_enquiry_id", "enquiry_notes", ["enquiry_id"])
    op.create_table("enquiry_replies", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("enquiry_id", sa.Integer(), sa.ForeignKey("enquiries.id", ondelete="CASCADE"), nullable=False), sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("body", sa.Text(), nullable=False), sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_enquiry_replies_enquiry_id", "enquiry_replies", ["enquiry_id"])

def downgrade() -> None:
    op.drop_table("enquiry_replies"); op.drop_table("enquiry_notes"); op.drop_constraint("uq_enquiries_reference", "enquiries", type_="unique"); op.drop_constraint("fk_enquiries_package_version", "enquiries", type_="foreignkey")
