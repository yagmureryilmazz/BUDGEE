"""add constraints and indexes to transactions

Revision ID: 5104f9b3dbf9
Revises: b6a29615585f
Create Date: 2026-01-30 21:46:01.668583

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5104f9b3dbf9'
down_revision: Union[str, Sequence[str], None] = 'b6a29615585f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_transactions_amount_nonnegative",
        "transactions",
        "amount >= 0"
    )
    op.create_index(
        "ix_transactions_user_created_at",
        "transactions",
        ["user_id", "created_at"]
    )

def downgrade() -> None:
    op.drop_index("ix_transactions_user_created_at", table_name="transactions")
    op.drop_constraint("ck_transactions_amount_nonnegative", "transactions", type_="check")
