# 2.1 remote and hosted preview validation

Scope: system-control routing, loopback ADB bridge, direct native TLS/Polo/voice,
remote/preview gestures and layout, shared artwork tint, Classic rendering,
repository/artifact naming and XCenter static/signaling deployment. Existing blur,
dock behavior and legacy Recovery Home are preserved.

Implementation and validation results are appended below after execution. Native
protocol changes need physical phone/TV checks; no successful physical control,
voice, debugging authorization or WebRTC TV session is implied by source checks.

## Local results

- TypeScript check passed; 45 shared Node tests passed, including direct native
  routing, no TV relay for native voice/pairing, explicit ADB opt-in, bounded
  protobuf frames, power key, and hosted-address validation.
- Host checks passed, including 62 Python tests (8 skipped in the default Python
  without cryptography), HTTP parser, remote key policy, updates and release history.
- Local Java compilation of LocalAdbController, HostedRemote and WavePalette passed
  against installed Android 37.0 stubs. This is not a release APK build.
- Android and iOS Expo/Hermes JavaScript exports passed. Native TLS modules still
  require full platform builds and physical interoperability validation.
- PWA update/reload/offline shell check passed.
- Initial full browser run: 28 passed, one Classic assertion still expected the
  deliberately replaced bitmap. It now verifies rendered SVG and absence of the
  cropping bitmap. Focused checks passed for Classic/preview, mobile touchpad,
  automatic layout, desktop keys/power and tablet swipes. An ADB fixture route
  registration order was corrected; the explicit opt-in check then passed.
- Existing npm audit reports SDK/tooling transitive advisories; the suggested
  automatic fix would downgrade Expo from the pinned SDK. No framework downgrade
  or broad dependency migration was made. New signaling server lock audit: zero.

Pending: full signed APK/AAB and iOS builds, physical phone direct TLS/voice,
TV-local ADB RSA approval, global app controls/power, on-TV color appearance,
and physical-TV hosted WebRTC. Web/mocked checks do not establish those outcomes.
