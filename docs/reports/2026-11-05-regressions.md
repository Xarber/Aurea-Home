# November 5 regression corrections

Scope: launcher update discovery, remote foreground routing, phone pairing responsiveness, shared artwork palette and wallpaper detail contrast.

Implemented: Home bypasses native system-control routing and optional ADB interception; existing pending app/input launches are retained. Phone RSA key generation explicitly yields using Forge's installed step API and cancels on target changes. Palette extraction groups nearby shades and ranks coverage, including black, without contrast weighting. Tint overlays retain visible light/dark wallpaper contours. Rejected manifest locations no longer produce a false current-version result.

Compatibility: pre-rename 2.0.8 binaries require one manual signed upgrade because their compiled URL allowlist rejects canonical renamed assets. No app data, identity or permission was changed.

Validation: TypeScript passed; all 46 shared tests passed, including direct TLS/voice protocol and background Home routing. Host suite passed (62 Python cases, eight optional host-crypto skips). A Java harness running the actual palette with synthetic Bitmap/Color adapters passed dominant-black/secondary-green/tiny-red and multi-shade-green coverage cases. These are host tests, not physical UI or audio proof. Blur implementation was not changed.

Physical evidence: read-only diagnostics collected from the TV privately; installed code 36, receiver service present. Retrieved logs did not contain a failed direct-AirPlay session. Direct music playback failure and physical phone pairing remain unresolved pending a fresh attempt and client-platform identification. No APK was installed, app restarted, settings changed or permissions granted. No new build/release or production deployment in this batch.

## iPhone clarification

User identified iPhone as the freezing pairing client and confirmed direct AirPlay connects silently. Installed socket library 6.4.3 passes decoded PEM directly to Apple's SecKeyCreateWithData; the shared client supplied PKCS#8. Corrected iOS transport to PKCS#1 while preserving the stored identity, Android representation and certificate pinning. All 46 shared tests and typechecking passed again; the actual TLS test now asserts iOS key import format. This is not physical iOS verification.

Direct-AirPlay receiver renderer/engine/service behavior has no functional diff between the earlier 2.0.8 source and 2.1.0; only a native copyright label changed. TV ADB became offline during the new log retrieval, so no new receiver-session evidence was obtained. Do not claim an audio fix from this batch. Sender device/app and local playback remain requested to isolate the stream failure.
