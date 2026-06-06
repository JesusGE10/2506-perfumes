"""Pydantic schemas for the media module (image upload responses)."""

import uuid

from pydantic import BaseModel


class ImagenUploadResponse(BaseModel):
    """Response schema for a single uploaded image."""
    id: uuid.UUID
    url: str
    s3_key: str | None
    orden: int
    es_principal: bool

    model_config = {"from_attributes": True}


class ReorderRequest(BaseModel):
    """
    Body for the image reorder endpoint.

    `order` must contain ALL image IDs for the product in the desired
    sequence. The first ID becomes es_principal=True.
    """
    order: list[uuid.UUID]
