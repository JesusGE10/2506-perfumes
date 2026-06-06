"""
Media service — orchestrates the full upload pipeline:
  validate → optimize → upload to R2 → persist to DB.

Handles both product images and admin avatars.
"""

import uuid

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException, NotFoundException
from app.modules.media import optimizer, r2_client
from app.modules.products.models import Imagen, Perfume

MAX_IMAGES_PER_PRODUCT = 10


# ── Product Image Pipeline ────────────────────────────────────────────────────

async def upload_product_images(
    db: AsyncSession,
    product_id: uuid.UUID,
    files: list[UploadFile],
) -> list[Imagen]:
    """
    Upload one or more images for a product.

    Business rules:
    - Maximum 10 images total per product (existing + incoming).
    - Files are validated for size and MIME type before processing.
    - First image of a product automatically becomes es_principal=True.
    - Each file is optimized to WebP before upload.
    """
    # Verify product exists
    product = await db.scalar(select(Perfume).where(Perfume.id == product_id))
    if not product:
        raise NotFoundException(f"Perfume con id '{product_id}' no encontrado")

    # Count existing images
    current_count = await db.scalar(
        select(func.count()).where(Imagen.perfume_id == product_id)
    ) or 0

    slots_available = MAX_IMAGES_PER_PRODUCT - current_count
    if slots_available <= 0:
        raise AppException(
            detail=f"El producto ya tiene {MAX_IMAGES_PER_PRODUCT} imágenes (límite máximo).",
            code="MAX_IMAGES_REACHED",
            status_code=409,
        )

    if len(files) > slots_available:
        raise AppException(
            detail=f"Solo puedes subir {slots_available} imagen(es) más "
                   f"(el producto ya tiene {current_count} de {MAX_IMAGES_PER_PRODUCT}).",
            code="TOO_MANY_IMAGES",
            status_code=409,
        )

    # Determine starting orden value
    max_orden = await db.scalar(
        select(func.coalesce(func.max(Imagen.orden), -1)).where(Imagen.perfume_id == product_id)
    ) or -1
    next_orden = int(max_orden) + 1

    is_first_product_image = current_count == 0
    created: list[Imagen] = []

    for idx, file in enumerate(files):
        raw = await file.read()
        content_type = file.content_type or "application/octet-stream"

        # Validate before expensive processing
        optimizer.validate_upload(raw, content_type)

        # Optimize to WebP
        webp_data = await optimizer.optimize_product_image(raw)

        # Upload to R2
        public_url, s3_key = await r2_client.upload_product_image(
            str(product_id), webp_data
        )

        # The very first image of the product becomes principal
        es_principal = is_first_product_image and idx == 0

        imagen = Imagen(
            perfume_id=product_id,
            url=public_url,
            s3_key=s3_key,
            orden=next_orden + idx,
            es_principal=es_principal,
        )
        db.add(imagen)
        created.append(imagen)

    await db.commit()
    for img in created:
        await db.refresh(img)

    return created


async def reorder_product_images(
    db: AsyncSession,
    product_id: uuid.UUID,
    ordered_ids: list[uuid.UUID],
) -> list[Imagen]:
    """
    Reorder images for a product.

    The `ordered_ids` list must contain ALL image IDs for the product.
    Position 0 → es_principal=True. All others → es_principal=False.
    """
    # Fetch all existing images for the product
    result = await db.execute(
        select(Imagen).where(Imagen.perfume_id == product_id)
    )
    images = result.scalars().all()

    image_map = {img.id: img for img in images}

    # Validate that all provided IDs belong to this product
    for img_id in ordered_ids:
        if img_id not in image_map:
            raise AppException(
                detail=f"La imagen '{img_id}' no pertenece a este producto.",
                code="IMAGE_NOT_FOUND",
                status_code=404,
            )

    # Apply new order
    for position, img_id in enumerate(ordered_ids):
        img = image_map[img_id]
        img.orden = position
        img.es_principal = position == 0

    await db.commit()

    result2 = await db.execute(
        select(Imagen)
        .where(Imagen.perfume_id == product_id)
        .order_by(Imagen.orden.asc())
    )
    return list(result2.scalars().all())


async def delete_product_image(
    db: AsyncSession,
    product_id: uuid.UUID,
    image_id: uuid.UUID,
) -> None:
    """
    Delete a product image from DB and R2.

    If the deleted image was es_principal, automatically promotes
    the next image (lowest orden) as the new principal.
    """
    result = await db.execute(
        select(Imagen).where(
            Imagen.id == image_id,
            Imagen.perfume_id == product_id,
        )
    )
    imagen = result.scalar_one_or_none()
    if not imagen:
        raise NotFoundException(f"Imagen '{image_id}' no encontrada para este producto")

    was_principal = imagen.es_principal
    s3_key = imagen.s3_key

    await db.delete(imagen)
    await db.flush()  # Apply delete before querying remaining images

    # If deleted image was principal, promote the next one
    if was_principal:
        next_result = await db.execute(
            select(Imagen)
            .where(Imagen.perfume_id == product_id)
            .order_by(Imagen.orden.asc())
            .limit(1)
        )
        next_img = next_result.scalar_one_or_none()
        if next_img:
            next_img.es_principal = True

    await db.commit()

    # Delete from R2 after successful DB commit to avoid orphans on DB error
    if s3_key:
        await r2_client.delete_object(s3_key)


# ── Admin Avatar Pipeline ─────────────────────────────────────────────────────

async def upload_admin_avatar(
    db: AsyncSession,
    admin_id: str,
    file: UploadFile,
) -> str:
    """
    Upload and replace the admin profile picture.

    The R2 key is deterministic (avatars/{admin_id}.webp), so uploading
    a new avatar automatically overwrites the previous one in R2.
    Returns the new public URL.
    """
    from app.modules.auth.models import AdminUser

    raw = await file.read()
    content_type = file.content_type or "application/octet-stream"
    optimizer.validate_upload(raw, content_type)

    webp_data = await optimizer.optimize_avatar(raw)
    public_url, s3_key = await r2_client.upload_admin_avatar(admin_id, webp_data)

    # Update DB
    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalar_one_or_none()
    if not admin:
        raise NotFoundException("Administrador no encontrado")

    admin.foto_perfil_url = public_url
    await db.commit()

    return public_url
