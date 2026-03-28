"""add github skill support

Revision ID: 0001_github_skill
Revises: None
Create Date: 2026-03-27

NOTE: If your DB already has a baseline migration, set `down_revision` to that
revision ID. If you started fresh (no prior migrations), set it to None and run:
  alembic stamp 0001_github_skill   # after the tables already exist via create_all
  OR
  alembic upgrade head              # on a fresh DB
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_github_skill"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add 'github' to the skill_source_enum — IF NOT EXISTS is supported in Postgres 9.6+
    op.execute("ALTER TYPE skill_source_enum ADD VALUE IF NOT EXISTS 'github'")

    op.add_column("skills", sa.Column("github_url", sa.String(500), nullable=True))
    op.add_column("skills", sa.Column("github_ref", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("skills", "github_ref")
    op.drop_column("skills", "github_url")
    # Note: removing a value from a Postgres ENUM requires recreating the type.
    # Skipped here — 'github' value will remain but unused after downgrade.
