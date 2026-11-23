# Changelog

## 2.3.0

Development · 2026-11-13

### Apple TV remote

Browse launchable apps, open Music and navigate the paired Apple TV with separate Aurea Home and input controls.

### AirPlay receiver settings

Rename or turn off the local receiver while keeping paired Apple TV controls available.

### Fixes & Improvements

Choose whether to advertise the local AirPlay receiver and customize its name. The launcher previews its layout while it loads.

Apple TV app discovery and launch require separate Companion pairing. Navigation depends on the device’s available features.

## 2.2.1

Reconstructed history · 2026-11-06

### Your televisions

A dedicated TV selector with a separate system-controls button for each saved television.

### Immediate TV typing

TV field events open the native keyboard; insertions and deletions are sent as you type without a Send step.

### Fixes & Improvements

Keep native buttons and microphone independent of the Home connection. Preserve recording during temporary iOS inactivity. Move television selection and system setup into TVs. Hide the unstable private app preview without removing it.

Automatic keyboard detection and independent system connections require the native phone app and a compatible paired Android TV Remote Service. Apps, inputs and music metadata still require Home. Repeat microphone and keyboard behavior need physical phone/TV verification.

## 2.2.0

Reconstructed history · 2026-11-05

### TV keyboard

Native system controls announce TV input fields and send entered text through the paired TLS connection without saving it.

### Private app preview

Encrypted peer preview with on-TV approval, eligible app audio, an app picker, navigation controls and bounded capture lifetime.

### Fixes & Improvements

Build iOS Expo modules coherently from source and reject incompatible bundled JSI symbols before packaging. Keep normal remote controls separate from preview media. Preserve app identity, pairing data and Recovery Home.

Preview requires a new approval on the TV for each session; HDMI/protected video cannot be captured and apps can block audio. Capture is limited to two minutes. Physical native capture, playback and keyboard validation remains required.

## 2.1.1

Reconstructed history · 2026-11-05

### Developer ideas

Offline capture, status history, search, batch actions and reviewed JSON imports with portable exports.

### Pairing feedback

Show progress while preparing a TV code and display system-control status for the selected television.

### Fixes & Improvements

Restore background Home without system pairing, group artwork shades by coverage, retain wallpaper contours, correct iPhone TLS key import, yield during pairing and harden microphone stop/restart. Report incomplete update checks accurately.

Physical iPhone microphone audio requires validation. Versions before the repository rename need one manual signed upgrade. Developer ideas remain local unless explicitly exported; imports require review.

## 2.1.0

[Stable · 2026-11-04](https://github.com/Xarber/Aurea-Home/releases/tag/v2.1.0) · [Beta · 2026-11-04](https://github.com/Xarber/Aurea-Home/releases/tag/v2.1.0-beta.36.de4e8ee)

### System controls

Native phones connect directly; browsers can use a locally authorized ADB button bridge.

### Artwork color

Shared cover colors and dominant-area tint without platform-only color transformations.

### Fixes & Improvements

Add power, larger remote layout, desktop key passthrough, touch page swipes, shared dominant artwork colors and a seamless rendered Classic wallpaper. Preserve the legacy recovery launcher.

Browser global buttons require optional debugging authorization on the TV. Microphone audio uses direct native Remote Service, not ADB. WebRTC requires a compatible network; physical interoperability needs device testing. Package ID and signing continuity are retained.

## 2.0.8

Reconstructed history · 2026-10-29

### Compact handset

Automatic Home/Complete layout; manual and touchpad choices live in Settings.

### Fixes & Improvements

Remove the extra selector bars, use horizontal compact volume and matched full rockers, prevent touchpad page scrolling, retain microphone capture across layout changes and correct a portable CI screenshot path.

Global controls and microphone require a working system-service connection. Some TVs reject connections originating on the TV itself. No debugging fallback is enabled.

## 2.0.7

Reconstructed history · 2026-10-29

### Complete remote

Automatically show full controls outside Home, or choose Home/Complete manually. Swipe on the touchpad or use arrow buttons.

### Original Classic colors

Restore the original blue/violet artwork instead of the gray fallback, including the remote’s launcher preview.

### Fixes & Improvements

Use Android platform TLS for system controls, add a separate reconnect action, restore Classic wallpaper and match the connected TV in launcher preview.

System controls need the Android TV Remote Service pairing. Browser commands still pass through the trusted TV server. Native TLS interoperability needs device verification; no ADB or accessibility fallback is enabled.

## 2.0.6

Reconstructed history · 2026-10-29

### Phone microphone

Tap to speak and tap again to stop; recording ends automatically after 30 seconds. Audio is not saved to disk.

### Fixes & Improvements

Encrypted in-memory voice packets, bounded recording sessions and cleanup on disconnect, app backgrounding and TV switching.

Requires paired Android TV system controls and receiver voice support. Native phones request microphone permission. Browsers need HTTPS/localhost; plain HTTP cannot capture audio. Recognition depends on the TV assistant.

## 2.0.5

Reconstructed history · 2026-10-29

### TV controls

Home, Back, volume and mute, channels, media transport, colored keys and TV voice assistant.

### Deeper TV colors

TV-only chroma compensation; web colors, blur and app banners are unchanged.

### Fixes & Improvements

Separate system-service errors from launcher connectivity, reconnect without replaying keys, correct TV manifest lint, and wait for rendered animation frames in browser checks.

System keys require Android TV Remote Service pairing and depend on the current app. Voice opens the TV assistant; phone microphone streaming is not included. TV color adjustment preserves calculated luminance; physical appearance needs testing.

## 2.0.4

Reconstructed history · 2026-10-29

### Home and remote recovery

Retires duplicate Home roots, resets interrupted input state, and offers a background-access permission shortcut.

### Music and wallpaper transitions

Activities expire after five paused minutes and return on playback; wallpapers and music tint preferences fade gradually.

### Fixes & Improvements

Single Home/input ownership; paused activities hide after five minutes. Wallpaper tint stays behind banners, covers rotating edges, and is slightly dimmer only on TV. Corrects explicit launcher export declarations.

Background Home and AirPlay use Android-supported task restoration and may require Display over other apps permission. New native behavior awaits device validation.

## 2.0.3

Reconstructed history · 2026-10-29

### Android entry points

TV Home and phone launcher entries are explicit and validated independently.

### Fixes & Improvements

Separate TV and phone launcher declarations; additional CI packaging memory and animation-aware browser checks.

Retains existing package identifiers, signing keys, preferences and visual effects.

## 2.0.2

Reconstructed history · 2026-10-29

### Gradual artwork colors

Wallpaper tint and waveform colors crossfade over 1.8 seconds and continue smoothly after quick song changes.

### Connected wallpaper and web demo

The remote follows TV wallpaper preferences. An opt-in local demo server supports approved phone pairing, in-app controls and Bonjour advertising.

### Fixes & Improvements

Remote wallpaper follows the TV across the full window; minimum waveform bars stay circular. Corrects the Android host compilation failure.

Web demo remote control requires the opt-in local LAN server and an open owner browser. It never controls real TV services. Native builds still require device testing.

## 2.0.1

Reconstructed history · 2026-10-29

### Native phone controls

Anchored native materials, safe areas, explicit menu controls and verified system pairing.

### Music wallpaper tint

An optional animated artwork gradient works with every wallpaper. Input hero marks use normalized visible bounds.

### Fixes & Improvements

Safe-area-aware anchored popups, submenu Back navigation, menu and combined playback buttons, customized input names/icons and silent paused waves.

Preserves the production Android TV package and signing key. iOS glass and preview rotation depend on OS support. Native fixes require device verification.

## 2.0.0

Reconstructed history · 2026-10-28

### Expo Home interface

A native React Native TV surface with real apps, registered inputs, saved dock, activities and native service controls.

### Shared phone and web base

The separate phone remote and installable web preview share the root Expo project.

### Fixes & Improvements

Improves TV focus and pairing restoration, shares AirPlay music activities with the phone remote, adds pairing confirmation and an optional blur switch, and corrects native build packaging.

Preserves Android TV package, signing identity and preferences. This framework migration requires physical TV validation before stable promotion. Mac Music interoperability remains unresolved.

## 1.8.1

Reconstructed history · 2026-10-28

### Working bundled remote page

Prevents Android from silently dropping the generated _expo directory.

### Fixes & Improvements

Preserves Expo JavaScript and CSS during Android asset packaging and verifies required web files before publication.

Keeps the existing package, signing key and settings. Global phone navigation still requires separate Android TV Remote Service pairing.

## 1.8.0

Reconstructed history · 2026-10-28

### Phone remote

Saved TVs, apps, inputs and in-app playback controls over the local network.

### Aurea Home

New identity and optional original minimal wallpapers; existing app data and signing identity stay compatible.

### Fixes & Improvements

Improves small-screen sources, reconnects discovery after network changes and separates credentials for each TV.

Phone companion and background system controls require device validation. System-wide navigation needs a separate Android TV Remote Service pairing; unavailable services fail safely.

## 1.7.5

[Stable · 2026-10-28](https://github.com/Xarber/Aurea-Home/releases/tag/v1.7.5) · [Beta · 2026-10-28](https://github.com/Xarber/Aurea-Home/releases/tag/v1.7.5-beta.23.156d63c)

### Pairing compatibility fix

Removes a local argument error before the PIN proof can be sent. Authentication checks remain enabled.

### Fixes & Improvements

Updates the HAP SRP call for the bundled authentication library and pins its version for reproducible builds.

Apple TV pairing confirmed on the physical TV. Playback metadata depends on the Apple TV app; simultaneous phone streaming remains unverified.

## 1.7.4

Reconstructed history · 2026-10-28

### Persistent protocol diagnostics

Retains bounded safe request phases, responses and error traces across app restarts, accessible through developer diagnostics or ADB.

### Fixes & Improvements

Records pairing phases, HTTP status, timings and safe exception locations in rotating files and Android logs; developer copy/export includes recent history.

Logs exclude PINs, credentials, addresses, device names, raw packets and exception messages. Diagnostics do not themselves fix every pairing error.

## 1.7.3

Reconstructed history · 2026-10-28

### Specific pairing errors

Reports a safe failure category and bounded HTTP status rather than replacing every failure with a generic message.

### Fixes & Improvements

Distinguishes receiver authorization rejection, HTTP status, authentication failure, timeout, interrupted connection and secure storage errors without exposing PINs or credentials.

Diagnostic improvements do not resolve every tvOS pairing rejection. Remote-only control and simultaneous phone AirPlay still require successful pairing and physical coexistence tests.

## 1.7.2

Reconstructed history · 2026-10-28

### tvOS 27 pairing compatibility

Adds a per-attempt client-name header to every AirPlay HAP pairing request using the focused upstream fix.

### Real Apple TV discovery

Excludes launcher receivers and preview instances while keeping genuine devices with duplicate names or older model identifiers.

### Fixes & Improvements

Filters this launcher’s local addresses, marked receiver/preview instances and the legacy UxPlay simulated Apple TV fingerprint without relying on device names.

The tvOS 27 patch targets PIN display only. Successful authenticated playback still requires device validation.

## 1.7.1

Reconstructed history · 2026-10-28

### Choose your HDMI input

Select any registered physical HDMI input, remember its identity and change it from paired-device settings. No port is selected automatically.

### Read the code and return

Show pairing code switches to the selected HDMI. Press Home to restore PIN entry within the original three-minute window.

### Fixes & Improvements

Pending pairing survives HDMI switching and Home recreation. Only unfinished code entry expires after three minutes; saved pairing has no application expiry timer.

HDMI selection uses registered TV inputs with no default port. A complete app-process restart requires starting an unfinished pairing again. Apple TV interoperability still requires physical pairing tests.

## 1.7.0

Reconstructed history · 2026-10-27

### Paired Apple TV

Discover, PIN-pair and observe an Apple TV directly from the launcher without an always-on PC.

### Remote playback activity

Reuses the music activity with supplied artwork and controls; remote bars are a playback animation, not measured sound.

### Fixes & Improvements

Keeps local AirPlay audio priority, protects saved pairing credentials and hides unavailable remote controls.

Apple TV interoperability requires device testing. Metadata, artwork and controls depend on tvOS and the playing app. This client does not fix Mac Music receiver compatibility.

## 1.6.0

Reconstructed history · 2026-10-27

### Automatic update discovery

Checks GitHub Releases on launch and periodically on foreground return, with caching and stable/beta filtering.

### Download inside Home

Read release notes while DownloadManager retrieves the universal APK with progress, network recovery and cancellation.

### Verified Android installation

Checks checksum, package, version, architecture and the installed signing identity, then opens Android’s official confirmation flow.

### Fixes & Improvements

Cached checks, channel and signing compatibility, metered-network preferences and Android installation confirmation preserve existing app data.

Updates require the same signing identity. Development-signed installations cannot accept the public release key. Mac Music remains unresolved.

## 1.5.1

[Beta · 2026-10-27](https://github.com/Xarber/Aurea-Home/releases/tag/v1.5.1-beta.16.243223c)

### Clearer release notes

Each release groups features with contextual icons; fixes stay in one expandable section.

### Details on demand

Select a feature to expand its explanation. Compatibility information remains visible in release details.

### Compact developer tools

A short menu opens detailed diagnostics only on request. Triple-press access and idle expiry are unchanged.

### Fixes & Improvements

Remote interactions keep temporary developer access active. Diagnostics identify observation time and local-only simulations. Existing dock, AirPlay and pairing behavior is preserved.

Direct Mac Music playback remains unresolved. Android TV hardware support varies by device.

## 1.5.0

[Beta · 2026-10-27](https://github.com/Xarber/Aurea-Home/releases/tag/v1.5.0-beta.15.f05f7b9)

### Developer tools

Triple-press the version in About to temporarily access safe diagnostics, simulations and remote revocation.

### Release history

Read previous releases in Settings and see a summary once after each native update.

### Portable Home preferences

Export and validate dock, input profiles, language and activity appearance with a recoverable import.

### Fixes & Improvements

Stronger remote request validation, private diagnostic exports and reproducible release builds.

Direct Mac Music playback remains unresolved. Android TV hardware support varies by device.

## 1.4

Reconstructed history · 2026-10-27

### Music activity details

Focus the music activity to reveal supplied artwork and title; expand it for playback controls.

### Connected remote activity

An authenticated phone heartbeat shows the connected remote activity. Stale presence expires.

### Activity appearance

Choose black or transparent activity backgrounds without changing the dock layout.

### Fixes & Improvements

Six frequency bands, album-color gradients, inset artwork and focused playback controls. Mac Music playback remains unresolved.

Direct Mac Music playback remains unresolved. Android TV hardware support varies by device.

## 1.3

Reconstructed history · 2026-10-27

### Automatic QR pairing

Scan the short-lived code, pair once and close the QR window automatically.

### Fixes & Improvements

Experimental FairPlay v2 handshake framing; this does not provide complete AirPlay 2 or guarantee Mac Music playback.

Direct Mac Music playback remains unresolved. Android TV hardware support varies by device.

## 1.1

Reconstructed history · 2026-10-26

### Customizable dock

Arrange six positions; All Apps is available in the final slot and Sources can be moved.

### HDMI shortcuts

Pin registered HDMI inputs and Live TV. Unsupported devices retain the system input-picker fallback.

### Integrated AirPlay

The receiver starts with Home and may stay in the background; supported video and mirroring open fullscreen.

### Fixes & Improvements

Three animated navigation stops, Italian and English, and fresh popup backdrops.

Direct Mac Music playback remains unresolved. Android TV hardware support varies by device.
