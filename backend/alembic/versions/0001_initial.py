"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM


revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text(
        "DO $$ BEGIN "
        "CREATE TYPE jobstatus AS ENUM "
        "('queued', 'extracting', 'analyzing', 'rendering_pdf', 'done', 'error'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; "
        "END $$"
    ))

    job_status = ENUM(
        "queued", "extracting", "analyzing", "rendering_pdf", "done", "error",
        name="jobstatus",
        create_type=False,
    )

    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("picture", sa.String(1024), nullable=True),
        sa.Column("encrypted_gemini_key", sa.LargeBinary(), nullable=True),
        sa.Column("default_model", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("provider", "subject", name="uq_user_provider_subject"),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("owner_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", job_status, nullable=False, server_default="queued"),
        sa.Column("model", sa.String(64), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("file_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_pages", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("markdown", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_jobs_owner_id", "jobs", ["owner_id"])
    op.create_index("ix_jobs_status", "jobs", ["status"])
    op.create_index("ix_jobs_created_at", "jobs", ["created_at"])


def downgrade() -> None:
    op.drop_table("jobs")
    op.execute("DROP TYPE IF EXISTS jobstatus")
    op.drop_table("users")
