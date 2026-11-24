# Implemented features

- Six-position customizable dock; All Apps only in position six. Sources is an ordinary pinnable shortcut. HDMI and Live TV can be pinned.
- Dock, Sources/Live TV, and app-grid snap positions; down hint; horizontal dock edges retain focus. Installed/system/casting app groups use app banners before text fallbacks.
- Device-logo source banners, slow banner zoom and crossfade, frosted surfaces, heavy popup/library contrast, reduced-motion fallback.
- Localized Italian/English controls, Wi-Fi detail reveal and time/date control bubble.
- Integrated background AirPlay receiver using the TV's friendly name. Screen mirroring/video fullscreen; audio uses six measured bass-to-treble bands and album-derived two-color gradient.
- Music and remote activities reveal short details, retain focus order and allow black or transparent backgrounds. Audio popup controls focus, album art, timeline and volume.
- Home-only HTTP remote, short-lived QR/PIN pairing, bounded token set, 5s presence heartbeat and 15s expiry. Port 80 attempted; 8765 fallback on restricted Android.
- About: version/commit footer, persistent icon-led changelog with expandable feature/fix details, once-per-update What's New (suppressed on first install), licenses and source link, export/import presentation preferences.
- Hidden developer configuration: version triple press reveals a persistent on/off toggle; enabled tools appear in Control Center. The reveal expires after inactivity/navigation, safe report copy/share, allowlisted event history, notification simulation and remote revocation.

- GitHub updater: launch/foreground checks, cached release metadata, channel filtering, icon-based notes, DownloadManager progress/cancel, APK validation and official Android installer. Installed signing identity must match. See [update contracts and limits](features/UPDATES.md).

## Limits

Mac Music playback is unresolved; do not advertise complete AirPlay 2/FairPlay v2 support. User reported iPad radio and local library working. DRM/photo/sender-specific modes require actual validation. Live HDMI/tuner behavior depends on TV manufacturer APIs. No external plugin loader, iOS app, OTA engine, root/port bypass, debloating or store submission is implemented.

## Aurea preview branch (not a stable release)

The feature branch adds Aurea Home branding, optional native wallpaper themes,
and the Expo web companion with keyboard navigation, music and remote fixtures.
See [the feature guide](features/EXPO_DEMO.md) for implemented preview behavior
and the boundary between browser demonstrations and physical TV capabilities.

See [phone remote](features/PHONE_REMOTE.md), [PWA](features/PWA.md), and [branding](BRANDING.md) for the separate Expo companion and native background bridge.

### Daylight wallpaper

Choose **Daylight** in Wallpapers to use a palette based on the local device clock. Dawn starts at 05:00, day at 08:00, dusk at 17:00 and night at 20:00. The shared launcher and remote preview reuse the existing palette crossfade and respect Reduced Motion. The classic Android launcher updates the scene without animation when motion is disabled. Daylight needs no location permission or network connection. Daylight on the shared launcher can also use a manually selected city for local sunrise, sunset and weather accents with subtle rain, snow, fog and storm layers. Search terms and rounded city coordinates go to Open-Meteo. The selected city is stored locally and excluded from account backups. The launcher falls back to the clock if a forecast is missing or stale. Scheduled wallpapers can assign any built-in wallpaper to each of the four local clock phases. The shared launcher crossfades between them, and a connected remote receives the active wallpaper ID without the city. The legacy launcher and the remote background use the clock-only mode.

### Household layout

The shared TV launcher keeps each household profile’s dock, library visibility and startup destination separate. Use **Control Center → Home layout** to choose Dock, Inputs or App library for a cold launch and to restore hidden apps. Hiding an app from the library leaves its dock shortcut and installed data available. The remote Home command still returns to the dock. Create folders from Home layout and assign apps from their contextual menus. Folders appear in the All apps tab. Export or import a profile’s library layout through Android’s document picker where available. Imports require confirmation and save the previous layout for recovery. Files contain dock pins, folders, hidden apps and the startup destination. The Home layout menu also controls dock size and optional navigation sounds. Wallpapers offers an optional time or time-and-date overlay.

### Household widgets

In **Control Center → Household widgets**, a profile can save world clocks, minute timers, date countdowns and household notes. They stay on this TV and are separate across profiles. Timer deadlines persist while the panel is closed. The panel shows elapsed deadlines when reopened. The current timer interface has no background alarm.
