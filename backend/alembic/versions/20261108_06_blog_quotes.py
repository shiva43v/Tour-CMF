"""Add blog CMS and consultant quotes.

Revision ID: 20261108_06
Revises: 20261108_05
"""
from alembic import op
import sqlalchemy as sa
revision="20261108_06"; down_revision="20261108_05"; branch_labels=None; depends_on=None
def upgrade():
 op.create_table("blog_posts",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("title",sa.String(255),nullable=False),sa.Column("slug",sa.String(180),nullable=False,unique=True),sa.Column("body",sa.Text(),nullable=False),sa.Column("cover_image_url",sa.String(1000)),sa.Column("category",sa.String(100)),sa.Column("seo_title",sa.String(255)),sa.Column("seo_description",sa.String(320)),sa.Column("related_package_slugs",sa.Text(),nullable=False,server_default="[]"),sa.Column("status",sa.String(20),nullable=False,server_default="draft"),sa.Column("author_id",sa.Integer(),sa.ForeignKey("users.id"),nullable=False),sa.Column("published_at",sa.DateTime(timezone=True)),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now()),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.func.now()))
 op.create_index("ix_blog_posts_status","blog_posts",["status"])
 op.create_table("quotes",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("public_token",sa.String(64),nullable=False,unique=True),sa.Column("package_id",sa.Integer(),sa.ForeignKey("packages.id")),sa.Column("enquiry_id",sa.Integer(),sa.ForeignKey("enquiries.id")),sa.Column("consultant_id",sa.Integer(),sa.ForeignKey("users.id"),nullable=False),sa.Column("traveller_name",sa.String(120),nullable=False),sa.Column("title",sa.String(255),nullable=False),sa.Column("amount",sa.Numeric(12,2),nullable=False),sa.Column("currency",sa.String(8),nullable=False,server_default="INR"),sa.Column("inclusions",sa.Text(),nullable=False,server_default="[]"),sa.Column("notes",sa.Text()),sa.Column("pdf_path",sa.String(500)),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now()))
def downgrade(): op.drop_table("quotes"); op.drop_table("blog_posts")
