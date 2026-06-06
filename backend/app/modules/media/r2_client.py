"""
Cloudflare R2 client — S3-compatible storage via boto3.

All blocking boto3 calls are wrapped in asyncio.to_thread() to avoid
blocking the FastAPI event loop. R2 uses the S3-compatible API so no
special SDK is required beyond boto3.
"""

import asyncio
import uuid
from functools import partial

import boto3
from botocore.config import Config

from app.config import settings

# ── Singleton boto3 client (thread-safe, reused across requests) ─────────────
# R2 requires path-style addressing (virtual-hosted style is not supported).
_s3_client = boto3.client(
    "s3",
    endpoint_url=settings.R2_ENDPOINT_URL,
    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
    config=Config(
        signature_version="s3v4",
        s3={"addressing_style": "path"},
    ),
    region_name="auto",  # R2 ignores region but boto3 requires a value
)

BUCKET = settings.R2_BUCKET_NAME
PUBLIC_BASE = settings.R2_PUBLIC_URL.rstrip("/")


def _upload_sync(key: str, data: bytes, content_type: str) -> str:
    """Synchronous upload — runs inside a thread via asyncio.to_thread()."""
    _s3_client.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
        # CacheControl for CDN efficiency: 1 year for immutable product images
        CacheControl="public, max-age=31536000, immutable",
    )
    return f"{PUBLIC_BASE}/{key}"


def _delete_sync(key: str) -> None:
    """Synchronous delete — runs inside a thread via asyncio.to_thread()."""
    _s3_client.delete_object(Bucket=BUCKET, Key=key)


# ── Public async API ──────────────────────────────────────────────────────────

async def upload_product_image(perfume_id: str, data: bytes) -> tuple[str, str]:
    """
    Upload an optimized WebP product image to R2.

    Returns:
        (public_url, s3_key) — both stored in the DB.
    """
    key = f"products/{perfume_id}/{uuid.uuid4().hex}.webp"
    url = await asyncio.to_thread(_upload_sync, key, data, "image/webp")
    return url, key


async def upload_admin_avatar(admin_id: str, data: bytes) -> tuple[str, str]:
    """
    Upload an admin avatar to R2.

    The key is deterministic (based on admin_id) so re-uploading naturally
    overwrites the previous avatar without orphaning objects.

    Returns:
        (public_url, s3_key)
    """
    key = f"avatars/{admin_id}.webp"
    url = await asyncio.to_thread(_upload_sync, key, data, "image/webp")
    return url, key


async def delete_object(key: str) -> None:
    """Delete an object from R2 by its storage key."""
    if key:
        await asyncio.to_thread(_delete_sync, key)
