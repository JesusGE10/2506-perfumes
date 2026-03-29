"""
Telegram notification module — sends order alerts to the admin.

Calls the Telegram Bot API with sendMessage to notify the admin
when a new order is received. This is fire-and-forget; failures
are caught at call sites to avoid blocking the checkout flow.

Configuration:
  TELEGRAM_BOT_TOKEN — obtained from @BotFather
  TELEGRAM_CHAT_ID   — your personal chat ID or a private group
  ADMIN_BASE_URL     — public URL of the frontend (e.g. https://tutienda.com)
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org/bot{token}/sendMessage"


async def send_order_alert(order) -> None:
    """
    Send a Telegram message to the admin when a new order is created.

    Args:
        order: Pedido ORM instance (must have items with presentacion loaded).

    Behavior:
        - Silently returns if TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set.
        - Logs a warning if the HTTP call fails but does NOT raise.
    """
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return  # Telegram not configured — skip silently

    # Build item lines
    item_lines = []
    for item in order.items:
        nombre = item.perfume_nombre or "Producto"
        ml = f"{item.tamano_ml}ml" if item.tamano_ml else ""
        item_lines.append(f"  • {nombre} {ml} × {item.cantidad}")

    items_text = "\n".join(item_lines) if item_lines else "  (sin items)"

    admin_url = f"{settings.ADMIN_BASE_URL}/admin/orders/{order.id}"

    message = (
        f"🛍️ *Nuevo pedido recibido*\n\n"
        f"👤 *Cliente:* {order.cliente_nombre}\n"
        f"📞 *Teléfono:* {order.cliente_telefono}\n"
        f"💳 *Método de pago:* {order.metodo_pago.value}\n"
        f"💰 *Total:* ${float(order.total):,.2f}\n\n"
        f"*Productos:*\n{items_text}\n\n"
        f"👉 [Ver pedido en Admin]({admin_url})"
    )

    url = TELEGRAM_API_BASE.format(token=settings.TELEGRAM_BOT_TOKEN)
    payload = {
        "chat_id": settings.TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(url, json=payload)
            if not response.is_success:
                logger.warning(
                    "Telegram alert failed: %s — %s",
                    response.status_code,
                    response.text,
                )
    except Exception as exc:
        logger.warning("Telegram alert error: %s", exc)
