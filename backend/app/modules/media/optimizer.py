"""
Image optimizer — converts any supported image format to WebP using Pillow.

Executed via asyncio.to_thread() to avoid blocking the event loop.
Supports JPEG, PNG, GIF, WebP input; always outputs WebP bytes.
"""

import asyncio
import io

from PIL import Image, UnidentifiedImageError

from app.core.exceptions import AppException

# Supported MIME types accepted by the upload endpoints
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def _to_webp_sync(raw: bytes, max_width: int, quality: int) -> bytes:
    """
    Synchronous WebP conversion — runs inside a thread.

    Steps:
    1. Open image with Pillow.
    2. Convert RGBA/P (palette) to RGB for WebP compatibility.
    3. Resize proportionally if wider than max_width.
    4. Encode as WebP with the given quality.
    """
    try:
        img = Image.open(io.BytesIO(raw))
    except UnidentifiedImageError:
        raise AppException(
            detail="El archivo no es una imagen válida",
            code="INVALID_IMAGE",
            status_code=400,
        )

    # Normalize color mode: WebP supports RGB and RGBA but not palette (P)
    if img.mode == "P":
        img = img.convert("RGBA")
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")

    # Proportional downscale — only shrink, never upscale
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)

    output = io.BytesIO()
    img.save(output, format="WEBP", quality=quality, method=6)
    return output.getvalue()


async def optimize_product_image(raw: bytes) -> bytes:
    """Convert and resize a product image to WebP (max 1200px wide, quality 82)."""
    return await asyncio.to_thread(_to_webp_sync, raw, 1200, 82)


async def optimize_avatar(raw: bytes) -> bytes:
    """Convert and resize an admin avatar to WebP (max 256px wide, quality 85)."""
    return await asyncio.to_thread(_to_webp_sync, raw, 256, 85)


def validate_upload(data: bytes, content_type: str) -> None:
    """
    Validate file size and MIME type before processing.
    Raises AppException on invalid input.
    """
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise AppException(
            detail=f"Tipo de archivo no soportado: '{content_type}'. "
                   f"Usa JPEG, PNG, WebP o GIF.",
            code="INVALID_CONTENT_TYPE",
            status_code=400,
        )
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise AppException(
            detail=f"El archivo supera el límite de 5 MB ({len(data) // 1024} KB recibido).",
            code="FILE_TOO_LARGE",
            status_code=413,
        )
