"""Business logic for store configuration management."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.store.models import StoreConfig
from app.modules.store.schemas import StoreConfigResponse, StoreConfigUpdate


async def get_store_config(db: AsyncSession) -> StoreConfigResponse:
    """
    Return the current store configuration as a structured object.

    Reads all rows from store_config and maps them to the response schema.
    Unknown keys are ignored (forward-compatible).
    """
    result = await db.execute(select(StoreConfig))
    rows = result.scalars().all()

    config_map = {row.key: row.value for row in rows}

    return StoreConfigResponse(
        whatsapp_number=config_map.get(StoreConfig.KEY_WHATSAPP_NUMBER),
        store_name=config_map.get(StoreConfig.KEY_STORE_NAME),
    )


async def update_store_config(
    db: AsyncSession, data: StoreConfigUpdate
) -> StoreConfigResponse:
    """
    Update one or more store configuration values.

    Only updates keys that are explicitly provided (not None in the request).
    Uses an upsert-like pattern: find existing row → update, or create if missing.
    """
    updates: dict[str, str | None] = {}
    if data.whatsapp_number is not None:
        updates[StoreConfig.KEY_WHATSAPP_NUMBER] = data.whatsapp_number
    if data.store_name is not None:
        updates[StoreConfig.KEY_STORE_NAME] = data.store_name

    for key, value in updates.items():
        result = await db.execute(
            select(StoreConfig).where(StoreConfig.key == key)
        )
        row = result.scalar_one_or_none()
        if row:
            row.value = value
        else:
            db.add(StoreConfig(key=key, value=value))

    await db.commit()
    return await get_store_config(db)
