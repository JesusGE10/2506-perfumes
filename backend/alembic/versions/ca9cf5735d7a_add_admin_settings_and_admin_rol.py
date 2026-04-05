"""add_admin_settings_and_admin_rol

Revision ID: ca9cf5735d7a
Revises: cf45ec2c79be
Create Date: 2026-04-05 00:11:14.283968
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'ca9cf5735d7a'
down_revision: Union[str, None] = 'cf45ec2c79be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the ENUM type first (PostgreSQL requires it before column creation)
    admin_rol_enum = postgresql.ENUM('super_admin', 'admin', name='admin_rol_enum', create_type=True)
    admin_rol_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create admin_settings table
    op.create_table(
        'admin_settings',
        sa.Column('admin_id', sa.UUID(), nullable=False),
        sa.Column('stock_low_threshold', sa.Integer(), nullable=False, server_default='15'),
        sa.Column('stock_critical_threshold', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['admin_id'], ['admin_user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('admin_id')
    )

    # 3. Add new columns to admin_user
    op.add_column('admin_user', sa.Column('foto_perfil_url', sa.String(length=500), nullable=True))
    op.add_column(
        'admin_user',
        sa.Column(
            'rol',
            postgresql.ENUM('super_admin', 'admin', name='admin_rol_enum', create_type=False),
            nullable=False,
            server_default='admin',
        )
    )


def downgrade() -> None:
    op.drop_column('admin_user', 'rol')
    op.drop_column('admin_user', 'foto_perfil_url')
    op.drop_table('admin_settings')
    # Drop the ENUM type
    admin_rol_enum = postgresql.ENUM('super_admin', 'admin', name='admin_rol_enum', create_type=False)
    admin_rol_enum.drop(op.get_bind(), checkfirst=True)
