# Paired Apple TV remote

In Aurea Home, open **AirPlay → Paired AirPlay device → Apple TV controls**. Use the directional buttons, Select, Back, Apple TV Home or Play/Pause. The underlying device must expose the corresponding pyatv feature.

Choose **Enable Apple TV apps** in the same settings panel. The launcher finds the Companion service on the previously paired Apple TV. Read its PIN on the Apple TV input, return to Aurea Home, and enter it in the existing pairing panel. Configure the Apple TV’s HDMI input there if needed. The connection keeps the original AirPlay credentials and stores Companion credentials alongside them in the existing encrypted TV store. App discovery and launch use the pinned pyatv 0.18.0 Companion API. Open Music appears when the device lists Apple’s Music app.

In Aurea Remote, tap the paired Apple TV’s name from the Remote tab. Use **Apple TV Home** for tvOS, **Aurea Home** for the launcher, and **Inputs** for the television’s inputs. Aurea relays the commands through its authenticated launcher connection, so the phone does not need to pair directly with tvOS. Launch accepts only identifiers in the device’s launchable-app list. Launching an app leaves the selected HDMI input to the user. The embedded and hosted web remotes share this route.

In **AirPlay** settings, the local receiver defaults to On. Turn it off to stop local AirPlay discovery and sessions. Set a custom receiver name or clear it to follow the TV’s system name. Name changes wait until active receiver sessions end. These settings do not change paired credentials, monitoring or control.
