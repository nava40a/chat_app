"""empty message

Revision ID: 505131f37eb3
Revises: dfbaf7715782
Create Date: 2024-10-20 21:47:15.228650

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '505131f37eb3'
down_revision: Union[str, None] = 'dfbaf7715782'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('tg_chat_id', sa.String(), nullable=True))
    op.drop_index('ix_users_tg_username', table_name='users')
    op.create_index(op.f('ix_users_tg_chat_id'), 'users', ['tg_chat_id'], unique=True)
    op.drop_column('users', 'tg_username')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('tg_username', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_index(op.f('ix_users_tg_chat_id'), table_name='users')
    op.create_index('ix_users_tg_username', 'users', ['tg_username'], unique=True)
    op.drop_column('users', 'tg_chat_id')
    # ### end Alembic commands ###