# SPDX-License-Identifier: AGPL-3.0-only
"""User-approved local TV registration."""

from aiohttp import ClientError
from homeassistant.config_entries import ConfigFlow
from homeassistant.helpers.aiohttp_client import async_get_clientsession
import voluptuous as vol

from .api import AureaClient, AureaError, DOMAIN, endpoint


class AureaConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input:
            try:
                client = AureaClient(async_get_clientsession(self.hass), **user_input)
                state = await client.request("state")
                if state.get("schema") != 1:
                    raise AureaError("Unsupported Aurea API")
            except ValueError:
                errors["base"] = "invalid_configuration"
            except (ClientError, TimeoutError, AureaError):
                errors["base"] = "cannot_connect"
            else:
                await self.async_set_unique_id(endpoint(user_input["address"]))
                self._abort_if_unique_id_configured()
                return self.async_create_entry(title=state.get("name", "Aurea Home"), data=user_input)
        return self.async_show_form(step_id="user", errors=errors, data_schema=vol.Schema({
            vol.Required("address"): str, vol.Required("key"): str,
        }))
