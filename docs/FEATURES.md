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

The shared TV launcher keeps each household profile’s dock, library visibility and startup destination separate. Use **Control Center → Home layout** to choose Dock, Inputs or App library for a cold launch and to restore hidden apps. Hiding an app from the library leaves its dock shortcut and installed data available. The remote Home command still returns to the dock. Create folders from Home layout and assign apps from their contextual menus. Folders appear in the All apps tab. Export or import a profile’s library layout through Android’s document picker where available. Imports require confirmation and save the previous layout for recovery. Files contain dock pins, folders, hidden apps and the startup destination. The Home layout menu also controls dock size, optional navigation sounds, and a small tilt for focused TV tiles. Reduced Motion keeps the existing focus outline and removes the tilt and scale. Wallpapers offers an optional time or time-and-date overlay.

### Household widgets

In **Control Center → Household widgets**, a profile can save world clocks, minute timers, date countdowns, notes, checklists, and local calendar entries. It also accepts JSON display cards with a title and bounded plain-text rows. They stay on this TV and are separate across profiles. Timer deadlines persist while the panel is closed. The panel shows elapsed deadlines when reopened. The current timer interface has no background alarm.

**Household widgets → Guest Wi-Fi** creates a scannable code for an open or WPA/WPA2 guest network entered by the user, including hidden networks. It generates the QR code locally and discards it when the screen closes or Aurea goes into the background. Anyone who sees the QR code can use the credentials it contains. [ZXing Wi-Fi format](https://github.com/zxing/zxing/wiki/Barcode-Contents#wi-fi-network-config-android-ios-11).

**Household widgets** can show the next date for a weekly or fortnightly bin collection beginning on a date you enter. Dates use the TV’s local calendar. The reminder appears in the widget list and does not schedule a system alarm. The same panel estimates the moon phase offline from the reference new moon and mean lunar cycle. It gives a phase name and omits exact times. [US Naval Observatory phase table](https://aa.usno.navy.mil/calculated/moon/phases?date=2026-01-01&format=t&nump=50), [Astronomical Almanac](https://aa.usno.navy.mil/downloads/c15_usb_online.pdf).

On Android TV, **Wallpapers → Personal photos** imports up to 12 images for the active profile from the system document picker. Aurea copies and resizes the selected images into private storage and strips file metadata during JPEG export. Rotation intervals are 1, 5, 15 or 60 minutes. Photos stay on the TV and the original files are left intact when a photo is removed from Aurea. The built-in wallpaper remains available as a fallback for missing photos. Document-picker availability depends on the TV firmware.

**Wallpapers → Idle display** can dim or cover the launcher or show a low-contrast clock on black. The first remote key wakes the display without also opening a focused app. Music keeps playing. The black cover does not send a hardware power command.

**Imported viewing history** accepts both the per-profile Netflix CSV and the detailed account download’s ViewingActivity CSV. For a detailed file, enter the exact Netflix profile name. The import excludes other profiles and supplemental clips. Aurea interprets times without an offset as UTC. The original file and profile name stay local. [Netflix viewing history](https://help.netflix.com/en/node/101917), [Netflix personal data download](https://help.netflix.com/en/node/100624/).

Keep Watching, Local watch history and Imported viewing history offer an app filter when more than one source is present. Filtering only changes the current view. Selecting All apps restores the full shelf. If a source disappears after hiding its last entry, the shelf shows the remaining sources.

In Aurea Remote, **Suggest a title** can send to a different saved TV without switching the handset’s current remote target. The destination TV must be paired and its active profile must have opted into requests. Aurea verifies the saved TV identity before sending the suggestion and does not replay an unconfirmed send.

On the Home profile, open a **Watch request** to look for exact title or title-and-episode matches in **Keep Watching**. The results name the source app. Choose a result to open its provider-supplied link. Aurea rechecks the match before opening. An unmatched request stays in the list until dismissed, and a remote submission cannot open an app by itself.

In **Find a title → Start from viewing history**, the launcher offers up to eight recent unique titles from local video history and imported Netflix records in the active profile. Selecting a title fills the search field so the user can edit it before searching. Only a submitted query goes to TMDB. Pick the matching result and open **Related titles** for suggestions. [TMDB title search workflow](https://developer.themoviedb.org/docs/search-and-query-for-details).

The Home profile can display an opted-in Android media app in the launcher’s music activity. Open **Android media**, select an active session, then choose **Show this app on Home**. Use the same panel to turn it off. Android notification access is required, and only controls advertised by the current session appear. AirPlay and paired Apple TV still take precedence. Android sessions show a decorative waveform, without album artwork or wallpaper tint, and the Android activity stays on the TV. The app must keep its media session active while the launcher is open. [Android media sessions](https://developer.android.com/reference/android/media/session/MediaSessionManager).

Home Assistant controls support adjustable brightness for dimmable lights, fan power and supported speed settings, and movement or position controls for compatible blinds, curtains, shades and shutters. Actions are sent only to devices explicitly added by the Home profile. If a device does not report support for a control, the panel omits it. [Home Assistant lights](https://www.home-assistant.io/integrations/light/), [fans](https://www.home-assistant.io/integrations/fan/), [covers](https://www.home-assistant.io/integrations/cover/).

A Home Assistant camera added to **Smart home → Home Assistant controls** can open a private full-screen live view. It uses the camera’s HTTPS MJPEG endpoint. Press Back to stop the stream and return to the device controls. Compatible feeds provide JPEG frames with content lengths. HLS-only or unsupported cameras can still use the existing snapshot action when the hub provides it. MJPEG video has no audio. [Home Assistant camera API implementation](https://github.com/home-assistant/core/blob/dev/homeassistant/components/camera/__init__.py).

A Home Assistant doorbell that exposes a standard `event.*` entity can show a notice in the Home profile. Add it to **Home Assistant controls**, open the entity, and turn on doorbell alerts. Aurea checks for new rings while Home is in the foreground. The first read establishes a baseline, so an earlier ring does not reappear on return. The hub exposes the latest event only, so multiple rings between checks may produce one notice. Camera viewing remains an explicit action. [Home Assistant doorbell event](https://contributors.home-assistant.io/core/entities/event/).

**Home layout → Quick actions** lets each TV profile choose up to three shortcuts to the existing Control Center panels. They appear in selection order at the top of Control Center. Smart home actions are available only to the Home profile. The standard settings remain accessible.

**Sound → Quiet hours** mutes Aurea’s navigation sounds for the active TV profile during a daily local-time interval. The interval can cross midnight. TV volume, media playback and visual alerts keep their regular behavior. Quiet hours are off until configured and stay on this TV.

**Wallpapers → Blank screen now / Screen timer** cover the launcher with black immediately or after 15, 30 or 60 minutes. The timer can be canceled in the same menu and clears when Home leaves the foreground. The overlay preserves audio and wakes on the first remote press. This is a software cover and does not change panel power or control the display while another app is open.

**Wallpapers → Video wallpaper** copies an MP4 into the active profile’s private storage. It loops without audio on Home and releases the decoder when Home is hidden, an idle display is active, or Reduced Motion is enabled. Clips are limited to 30 seconds, 48 MB and 1080p. A rejected replacement preserves the existing clip. Photos or a built-in wallpaper remain visible below the video.

In the Home profile, **Household profiles → Kids profile** configures a secondary profile with approved installed apps and a parent code. Selecting the profile opens a simplified launcher and exiting it requires the code. Aurea app launch requests respect the allowlist while Kids is active. The code protects Aurea’s profile switch and is not a substitute for Android parental controls or restrictions in individual apps.

Android TV profiles can opt into **Home layout → Allow paired remotes to edit this layout**. In Aurea Remote, open **Settings → TV Home layout** to move dock apps or choose a built-in wallpaper. The option is off by default, applies only to the active profile and is unavailable in Kids. If the TV layout changes after the remote loads it, Aurea rejects the stale edit.

The Headlines widget can open a configured HTTPS RSS or Atom feed on demand. It shows plain-text titles and only opens validated HTTPS article links. It does not run background requests or render feed HTML.

**Household widgets → Local conditions** can show model-estimated temperature, humidity, today’s maximum UV index and European air quality index for the selected city. It fetches only on request and shows missing values without substituting zero. [Open-Meteo forecast API](https://open-meteo.com/en/docs), [Open-Meteo air quality API](https://open-meteo.com/en/docs/air-quality-api).

## Roku remote

On iOS and Android, open **TVs → Roku remote** and enter a Roku’s local IP address. Aurea can control navigation, Home, options and playback when Roku OS permits **Control by mobile apps**. Supported models also expose volume and power off. The phone saves the latest chosen Roku separately from Aurea TV pairing. This adapter runs on the local network and has no web or hosted relay. [Roku External Control Protocol](https://developer.roku.com/dev/docs/external-control-api).
