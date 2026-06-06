"""add_s3_key_to_imagen_and_store_config

Revision ID: 3f82a1c94e10
Revises: ca9cf5735d7a
Create Date: 2026-06-05 23:30:00.000000

Cambios:
- Añade columna `s3_key` (nullable) a la tabla `imagen` para poder eliminar
  objetos de Cloudflare R2 sin parsear la URL pública.
- Crea la tabla `store_config` con diseño key-value para configuración
  global de la tienda (número de WhatsApp, nombre del negocio, etc.).
- Pre-popula los keys iniciales con valores nulos.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '3f82a1c94e10'
down_revision: Union[str, None] = 'ca9cf5735d7a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Añadir columna s3_key a la tabla imagen ───────────────────────────
    # nullable=True para mantener compatibilidad con registros legacy que
    # tienen URLs locales (/productos/*.png) sin s3_key asociado.
    op.add_column(
        'imagen',
        sa.Column('s3_key', sa.String(length=500), nullable=True)
    )

    # ── 2. Crear tabla store_config (key-value global de la tienda) ──────────
    op.create_table(
        'store_config',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('NOW()'),
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key', name='uq_store_config_key'),
    )

    # ── 3. Pre-poblar keys iniciales con valores nulos ───────────────────────
    # Se usa op.execute() para insertar directamente sin depender del ORM,
    # evitando problemas de orden de importación durante migraciones.
    op.execute(
        sa.text("""
            INSERT INTO store_config (id, key, value, updated_at)
            VALUES
                (gen_random_uuid(), 'whatsapp_number', NULL, NOW()),
                (gen_random_uuid(), 'store_name', 'Perfumería', NOW())
        """)
    )


def downgrade() -> None:
    # Eliminar en orden inverso
    op.execute(sa.text("DELETE FROM store_config WHERE key IN ('whatsapp_number', 'store_name')"))
    op.drop_table('store_config')
    op.drop_column('imagen', 's3_key')
