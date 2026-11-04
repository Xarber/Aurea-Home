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

The final 32-case browser pass caught one new palette error (31 passed): artwork
area positions had been appended to color strings, causing interpolateColor to
receive a number-like string. Numeric positions now have their own optional
transition values, preserving synchronized and interrupted fades. Both focused
palette regression tests passed after correction. Hosted verification is repeated
against that corrected source, not the earlier deployment.

A new integration test executes the actual native-client TypeScript against two
real local TLS servers through a Node adapter for the native socket boundary. It
passed RSA/Polo proof, delayed certificate retrieval with early Configure frames,
SetActive/Start readiness, ping response, direct power key, local RSA-OAEP/AES-GCM
voice unwrap and zero-padded 8 KiB PCM. This is real protocol/crypto testing on the
host, with mocked Expo storage/randomness/socket adapters, not a physical phone.

Final local results: 46 shared tests and all 32 browser cases passed. The public
site served 2.1.0 / source 0d6c70f; two real browser peers paired through XCenter,
issued a demo music launch and showed zero page errors. Signaling returned a real
peer ID over public HTTPS. The dedicated aurea-peer unit was active; existing
Velunivo services were preserved. Source-stamped release.json was verified. The
TV website link also has its own QR, and pairing events refresh the visible PIN
inside an already-open TV pairing panel when origin binding rotates the code.
