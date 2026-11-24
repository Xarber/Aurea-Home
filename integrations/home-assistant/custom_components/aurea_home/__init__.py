# SPDX-License-Identifier: AGPL-3.0-only
"""Aurea Home for Home Assistant."""

from datetime import timedelta
from aiohttp import ClientError
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
import logging

from .api import AureaClient, AureaError, DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass, entry):
    """Set up the authenticated TV and its media-player entity."""
    client = AureaClient(async_get_clientsession(hass), entry.data["address"], entry.data["key"])

    async def refresh():
        try:
            state = await client.request("state")
        except (ClientError, TimeoutError, AureaError) as error:
            raise UpdateFailed("Aurea Home is unavailable") from error
        if state.get("schema") != 1 or "interactive" not in state:
            raise UpdateFailed("The TV returned an incompatible Aurea state")
        return state

    coordinator = DataUpdateCoordinator(hass, _LOGGER, name=entry.title, config_entry=entry,
                                        update_interval=timedelta(seconds=20), update_method=refresh)
    await coordinator.async_config_entry_first_refresh()
    if coordinator.data is None:
        raise ConfigEntryNotReady()
    entry.runtime_data = (client, coordinator)
    await hass.config_entries.async_forward_entry_setups(entry, ["media_player"])
    return True


async def async_unload_entry(hass, entry):
    return await hass.config_entries.async_unload_platforms(entry, ["media_player"])
