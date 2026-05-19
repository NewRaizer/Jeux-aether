"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-19

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False, unique=True),
        sa.Column("logo_url", sa.String(1024)),
        sa.Column("primary_color", sa.String(16), server_default="#4f46e5"),
        sa.Column("created_at", sa.DateTime()),
    )

    op.create_table(
        "super_admins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
    )

    op.create_table(
        "tenant_admins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "tenant_id",
            sa.Integer(),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(32), server_default="admin"),
    )

    op.create_table(
        "modules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "tenant_id",
            sa.Integer(),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.DateTime()),
        sa.UniqueConstraint("tenant_id", "slug", name="uq_module_tenant_slug"),
    )

    op.create_table(
        "questionnaires",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "module_id",
            sa.Integer(),
            sa.ForeignKey("modules.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.false()),
    )

    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "questionnaire_id",
            sa.Integer(),
            sa.ForeignKey("questionnaires.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(16), server_default="mcq"),
        sa.Column("order", sa.Integer(), server_default="0"),
    )

    op.create_table(
        "choices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "question_id",
            sa.Integer(),
            sa.ForeignKey("questions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), server_default=sa.false()),
    )

    op.create_table(
        "quiz_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "questionnaire_id",
            sa.Integer(),
            sa.ForeignKey("questionnaires.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("learner_firstname", sa.String(255), nullable=False),
        sa.Column("learner_lastname", sa.String(255), nullable=False),
        sa.Column("started_at", sa.DateTime()),
        sa.Column("completed_at", sa.DateTime()),
        sa.Column("score_percent", sa.Float()),
    )

    op.create_table(
        "answers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("quiz_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "question_id",
            sa.Integer(),
            sa.ForeignKey("questions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "selected_choice_id",
            sa.Integer(),
            sa.ForeignKey("choices.id", ondelete="SET NULL"),
        ),
        sa.Column("open_text", sa.Text()),
    )


def downgrade() -> None:
    for table in [
        "answers",
        "quiz_sessions",
        "choices",
        "questions",
        "questionnaires",
        "modules",
        "tenant_admins",
        "super_admins",
        "tenants",
    ]:
        op.drop_table(table)
