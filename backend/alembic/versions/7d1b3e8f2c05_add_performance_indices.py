"""add_performance_indices

Revision ID: 7d1b3e8f2c05
Revises: 3f82a1c94e10
Create Date: 2026-06-06 05:14:00.000000

Añade índices de rendimiento para acelerar las queries del dashboard de métricas:

1. Índice compuesto (pedido.estado, pedido.created_at)
   - Cubre todas las queries de métricas que filtran por estado Y fecha a la vez.
   - Sin este índice, PostgreSQL escanea la tabla completa en cada carga del dashboard.

2. Índice simple (presentacion.stock)
   - Cubre la query de "presentaciones de bajo stock" (WHERE stock < threshold).
   - Especialmente útil con catálogos grandes (>500 presentaciones).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '7d1b3e8f2c05'
down_revision: Union[str, None] = '3f82a1c94e10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Índice compuesto en pedido (estado, created_at) ───────────────────
    # Las métricas del dashboard siempre filtran por AMBAS columnas simultáneamente.
    # El orden (estado, created_at) es óptimo porque estado tiene baja cardinalidad
    # y actúa como partición lógica del índice.
    op.create_index(
        index_name='ix_pedido_estado_created_at',
        table_name='pedido',
        columns=['estado', 'created_at'],
        postgresql_using='btree',
    )

    # ── 2. Índice simple en presentacion.stock ───────────────────────────────
    # Cubre la query WHERE stock < :threshold usada en el widget de bajo stock.
    op.create_index(
        index_name='ix_presentacion_stock',
        table_name='presentacion',
        columns=['stock'],
        postgresql_using='btree',
    )


def downgrade() -> None:
    op.drop_index('ix_presentacion_stock', table_name='presentacion')
    op.drop_index('ix_pedido_estado_created_at', table_name='pedido')
