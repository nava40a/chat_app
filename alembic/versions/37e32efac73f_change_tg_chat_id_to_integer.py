"""Change tg_chat_id to integer

Revision ID: 37e32efac73f
Revises: b43d9c1d3e85
Create Date: 2024-10-21 16:21:28.461484

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37e32efac73f'
down_revision: Union[str, None] = 'b43d9c1d3e85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.alter_column(
        'users',
        'tg_chat_id',
        type_=sa.Integer(),
        postgresql_using='tg_chat_id::integer'
    )

def downgrade():
    op.alter_column(
        'users',
        'tg_chat_id',
        type_=sa.String(),
        postgresql_using='tg_chat_id::text'
    )
