# Home Assistant and Homebridge

Aurea Home can accept local commands from either hub. Open **Control Center → Smart home** on the TV. Create a separate integration key for each hub and save the private IPv4 URL displayed by the TV. The local remote service must be running. Disable a hub’s key on the TV to revoke access.

## Installation from source

- **Home Assistant** — Copy the included `integrations/home-assistant/custom_components/aurea_home` directory into the server configuration’s `custom_components` directory. Restart Home Assistant and add **Aurea Home** from Devices & services. Use the Home Assistant key displayed on the TV. The integration creates a TV media player with source selection, volume and mute.
- **Homebridge** — Install the included `integrations/homebridge` package from its local directory using the same npm environment as Homebridge. Configure the **AureaHome** platform with a `televisions` list containing an `address` and a Homebridge `key` for each TV. Add the published external TV accessory in Apple Home through Homebridge’s supported accessory pairing. Restart Homebridge after connecting the TV if inputs were unavailable when it started.

Both hosts can open Aurea Home, select inputs exposed by Android, and set Android media volume and mute. The endpoint reports whether the TV is interactive and whether Home is foregrounded. Android does not provide a universal current HDMI source to ordinary apps. The integrations leave that source unknown outside Home. Starting the TV from standby, controlling other smart-home devices from the launcher and commanding vendor-controlled audio systems require separate supported capabilities.

## Trust boundary

The TV stores independent random credentials for both integrations in an Android-Keystore-backed file. Codes are displayed when generated and can be revoked independently. The local endpoint uses authenticated request and response bodies. The key is never transmitted. Both sides must have clocks within 30 seconds. The TV remembers recently accepted nonces. A process challenge binds requests to the lifetime of the TV process so a signed request from before a restart cannot be reused. Restrict both hubs and the TV to a trusted local network. Request data has integrity protection but is readable by peers able to observe local HTTP traffic. The endpoint rejects loopback requests, cross-origin requests, app launches, debugging, pairing, microphone, capture and arbitrary actions.

Checks cover the Android signature verifier on a host JVM and Homebridge request signing and response verification with fixtures. The Home Assistant source can be syntax-checked locally. Target validation requires a physical TV plus reachable Home Assistant and Homebridge instances. No community store publication is configured.

Integration references include the [Home Assistant media player entity](https://contributors.home-assistant.io/core/entities/media-player/) and [Homebridge television example](https://github.com/homebridge/homebridge-examples/tree/master/television-example).
