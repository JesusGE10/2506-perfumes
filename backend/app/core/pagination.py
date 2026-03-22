"""
Generic pagination utilities.

Provides a reusable pattern for paginated API responses following
the convention: ?page=1&size=20 → { items, total, page, size, pages }
"""

import math
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Query parameters for pagination."""

    page: int = 1
    size: int = 20

    @property
    def offset(self) -> int:
        """Calculate SQL offset from page and size."""
        return (self.page - 1) * self.size


class PaginatedResponse(BaseModel, Generic[T]):
    """Standardized paginated response envelope."""

    items: list[T]
    total: int
    page: int
    size: int
    pages: int

    @classmethod
    def create(
        cls,
        items: list[T],
        total: int,
        page: int,
        size: int,
    ) -> "PaginatedResponse[T]":
        """Factory method to build a paginated response."""
        return cls(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=math.ceil(total / size) if size > 0 else 0,
        )
