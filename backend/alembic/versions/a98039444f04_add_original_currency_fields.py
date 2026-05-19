"""add original currency fields"""

from alembic import op
import sqlalchemy as sa

# 🔥 ÖNEMLİ: TYPE HINT YOK!
revision = 'a98039444f04'
down_revision = 'e7c4ee576a24'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "transactions",
        sa.Column("original_amount", sa.Numeric(12, 2), nullable=True)
    )
    op.add_column(
        "transactions",
        sa.Column("original_currency", sa.String(length=3), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("transactions", "original_amount")
    op.drop_column("transactions", "original_currency")