"""Create Phase 2 foundation tables."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261106_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The named enum is created explicitly, then reused by the table without
    # SQLAlchemy attempting a second CREATE TYPE statement.
    user_role = postgresql.ENUM(
        "ADMIN", "EDITOR", "CONSULTANT", name="userrole", create_type=False
    )
    user_role.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="CONSULTANT"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_table(
        "packages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("published_version_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_packages_slug", "packages", ["slug"])
    op.create_index("ix_packages_status", "packages", ["status"])
    op.create_table(
        "package_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("package_id", sa.Integer(), sa.ForeignKey("packages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("package_id", "version_number", name="uq_package_version_number"),
    )
    op.create_index("ix_package_versions_package_id", "package_versions", ["package_id"])
    op.create_foreign_key("fk_packages_published_version", "packages", "package_versions", ["published_version_id"], ["id"])
    op.create_table(
        "seasonal_prices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("package_version_id", sa.Integer(), sa.ForeignKey("package_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("season_name", sa.String(100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("price_per_person", sa.Numeric(12, 2), nullable=False),
        sa.Column("price_basis", sa.String(50), nullable=False, server_default="twin_sharing"),
        sa.Column("gst_note", sa.String(255), nullable=False, server_default="GST applicable"),
    )
    op.create_index("ix_seasonal_prices_package_version_id", "seasonal_prices", ["package_version_id"])
    op.create_table(
        "enquiries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(30), nullable=False, server_default="web"),
        sa.Column("original_message", sa.Text(), nullable=False),
        sa.Column("traveller_name", sa.String(120), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("consent_whatsapp", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(30), nullable=False, server_default="new"),
        sa.Column("package_id", sa.Integer(), sa.ForeignKey("packages.id"), nullable=True),
        sa.Column("assigned_to_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_enquiries_email", "enquiries", ["email"])
    op.create_index("ix_enquiries_status", "enquiries", ["status"])
    op.create_index("ix_enquiries_assigned_to_id", "enquiries", ["assigned_to_id"])
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.String(64), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_activity_logs_actor_id", "activity_logs", ["actor_id"])
    op.create_index("ix_activity_logs_entity_type", "activity_logs", ["entity_type"])
    op.create_index("ix_activity_logs_entity_id", "activity_logs", ["entity_id"])


def downgrade() -> None:
    op.drop_table("activity_logs")
    op.drop_table("enquiries")
    op.drop_table("seasonal_prices")
    op.drop_constraint("fk_packages_published_version", "packages", type_="foreignkey")
    op.drop_table("package_versions")
    op.drop_table("packages")
    op.drop_table("users")
    postgresql.ENUM(name="userrole").drop(op.get_bind(), checkfirst=True)
