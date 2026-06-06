"""HTTP router for the media upload pipeline."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_db
from app.modules.media import service
from app.modules.media.schemas import ImagenUploadResponse, ReorderRequest

router = APIRouter(tags=["media"])

PREFIX_PRODUCT_IMAGES = "/admin/products/{product_id}/images"
PREFIX_AVATAR = "/admin/auth/me/avatar"


# ── Product Image Endpoints ───────────────────────────────────────────────────

@router.post(
    PREFIX_PRODUCT_IMAGES,
    response_model=list[ImagenUploadResponse],
    status_code=201,
    dependencies=[Depends(get_current_admin)],
    summary="Subir imágenes a un producto (máx. 10 total)",
)
async def upload_product_images(
    product_id: uuid.UUID,
    files: Annotated[list[UploadFile], File(description="Imágenes a subir (JPEG, PNG, WebP, GIF — máx. 5 MB c/u)")],
    db: AsyncSession = Depends(get_db),
):
    """
    Upload one or more images for a product.

    - Maximum 10 images per product (total across all uploads).
    - First image of a product automatically becomes the principal image.
    - Files are converted to WebP (max 1200px wide) before storage.
    """
    return await service.upload_product_images(db, product_id, files)


@router.patch(
    f"{PREFIX_PRODUCT_IMAGES}/reorder",
    response_model=list[ImagenUploadResponse],
    dependencies=[Depends(get_current_admin)],
    summary="Reordenar imágenes de un producto",
)
async def reorder_product_images(
    product_id: uuid.UUID,
    body: ReorderRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Reorder all images for a product.

    Send ALL image IDs in the desired order. Position 0 becomes the
    principal image shown in catalog listings.
    """
    return await service.reorder_product_images(db, product_id, body.order)


@router.delete(
    f"{PREFIX_PRODUCT_IMAGES}/{{image_id}}",
    status_code=204,
    dependencies=[Depends(get_current_admin)],
    summary="Eliminar una imagen de un producto",
)
async def delete_product_image(
    product_id: uuid.UUID,
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a product image from the database and Cloudflare R2.

    If the deleted image was the principal, the next image by order
    is automatically promoted.
    """
    await service.delete_product_image(db, product_id, image_id)


# ── Admin Avatar Endpoint ─────────────────────────────────────────────────────

@router.post(
    PREFIX_AVATAR,
    summary="Subir foto de perfil del administrador",
)
async def upload_admin_avatar(
    file: UploadFile = File(description="Imagen de avatar (JPEG, PNG, WebP — máx. 5 MB)"),
    payload: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and replace the current admin's profile picture.

    The image is converted to WebP (max 256px) and stored in R2.
    The DB row is updated atomically.
    """
    admin_id = payload["sub"]
    foto_url = await service.upload_admin_avatar(db, admin_id, file)
    return {"foto_perfil_url": foto_url}
