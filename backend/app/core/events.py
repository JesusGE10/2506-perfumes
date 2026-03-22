"""
Event dispatcher for n8n webhook integrations.

The backend dispatches events to n8n via HTTP POST webhooks.
n8n handles all external communications (WhatsApp, Telegram, etc.)
instead of hardcoding that logic in the backend.

Events are fire-and-forget: failures are logged but do not
block the main business operation.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def dispatch_event(event_name: str, payload: dict) -> bool:
    """
    Send an event to n8n via webhook.

    Args:
        event_name: name of the event (e.g. "order_completed", "low_stock").
                    This maps to the n8n webhook path:
                    {N8N_WEBHOOK_BASE_URL}/{event_name}
        payload: data to send as JSON body.

    Returns:
        True if the webhook responded successfully, False otherwise.
    """
    url = f"{settings.N8N_WEBHOOK_BASE_URL}/{event_name}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)

        if response.status_code >= 400:
            logger.warning(
                "n8n webhook %s returned status %d: %s",
                event_name,
                response.status_code,
                response.text[:200],
            )
            return False

        logger.info("Event '%s' dispatched to n8n successfully.", event_name)
        return True

    except httpx.TimeoutException:
        logger.error("Timeout dispatching event '%s' to n8n.", event_name)
        return False
    except httpx.RequestError as exc:
        logger.error(
            "Error dispatching event '%s' to n8n: %s", event_name, str(exc)
        )
        return False
