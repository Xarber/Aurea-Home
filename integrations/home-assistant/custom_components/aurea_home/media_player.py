# SPDX-License-Identifier: AGPL-3.0-only
"""Home Assistant media-player entity for the local TV."""

from homeassistant.components.media_player import MediaPlayerDeviceClass, MediaPlayerEntity, MediaPlayerEntityFeature, MediaPlayerState
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .api import AureaError


async def async_setup_entry(hass, entry, async_add_entities):
    client, coordinator = entry.runtime_data
    async_add_entities([AureaTelevision(entry.entry_id, entry.title, client, coordinator)])


class AureaTelevision(CoordinatorEntity, MediaPlayerEntity):
    _attr_device_class = MediaPlayerDeviceClass.TV
    _attr_supported_features = (MediaPlayerEntityFeature.SELECT_SOURCE |
                                MediaPlayerEntityFeature.VOLUME_SET | MediaPlayerEntityFeature.VOLUME_MUTE)

    def __init__(self, identifier, title, client, coordinator):
        super().__init__(coordinator)
        self._attr_unique_id = identifier
        self._attr_name = title
        self.client = client

    @property
    def state(self):
        return MediaPlayerState.ON if self.coordinator.data["interactive"] else MediaPlayerState.OFF

    @property
    def volume_level(self):
        return self.coordinator.data["volume"] / 100

    @property
    def is_volume_muted(self):
        return self.coordinator.data["muted"]

    def _sources(self):
        sources = {"Aurea Home": None}
        for item in self.coordinator.data["sources"]:
            name = item["name"]
            if name in sources:
                name = f'{name} ({item.get("subtitle") or item["id"]})'
            sources[name] = item["id"]
        return sources

    @property
    def source_list(self):
        return list(self._sources())

    @property
    def source(self):
        return "Aurea Home" if self.coordinator.data["homeActive"] else None

    async def _command(self, action, **parameters):
        try:
            await self.client.request(action, **parameters)
        except (AureaError, OSError, TimeoutError) as error:
            raise HomeAssistantError("The television could not complete this action") from error
        await self.coordinator.async_request_refresh()

    async def async_select_source(self, source):
        items = self._sources()
        if source not in items:
            raise HomeAssistantError("Unknown television input")
        if items[source] is None:
            await self._command("open_home")
        else:
            await self._command("input", id=items[source])

    async def async_set_volume_level(self, volume):
        await self._command("volume", value=round(volume * 100))

    async def async_mute_volume(self, mute):
        await self._command("mute", value=mute)
