# November 5 regression corrections

Scope: launcher update discovery, remote foreground routing, phone pairing responsiveness, shared artwork palette and wallpaper detail contrast.

Implemented: Home bypasses native system-control routing and optional ADB interception; existing pending app/input launches are retained. Phone RSA key generation explicitly yields using Forge's installed step API and cancels on target changes. Palette extraction groups nearby shades and ranks coverage, including black, without contrast weighting. Tint overlays retain visible light/dark wallpaper contours. Rejected manifest locations no longer produce a false current-version result.

Compatibility: pre-rename 2.0.8 binaries require one manual signed upgrade because their compiled URL allowlist rejects canonical renamed assets. No app data, identity or permission was changed.

Validation: TypeScript passed; all 46 shared tests passed, including direct TLS/voice protocol and background Home routing. Host suite passed (62 Python cases, eight optional host-crypto skips). A Java harness running the actual palette with synthetic Bitmap/Color adapters passed dominant-black/secondary-green/tiny-red and multi-shade-green coverage cases. These are host tests, not physical UI or audio proof. Blur implementation was not changed.

Physical evidence: read-only diagnostics collected from the TV privately; installed code 36, receiver service present. Retrieved logs did not contain a failed direct-AirPlay session. Direct music playback failure and physical phone pairing remain unresolved pending a fresh attempt and client-platform identification. No APK was installed, app restarted, settings changed or permissions granted. No new build/release or production deployment in this batch.
