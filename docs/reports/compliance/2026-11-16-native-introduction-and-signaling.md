# Native introduction, installation and signaling source checks

Aurea's testing branch implements TV and phone introductions, phone sample-screen selection, install badges and a temporary developer signaling session. Scope covers UADS-UI-004, UADS-DIST-003, UADS-DEV-003 and the revised §8 start gate. Structural validation does not mark those requirements as fully satisfied.

- TypeScript and 62 Expo source tests passed. Three tests cover the signaling endpoint, rejected credential-bearing addresses and a credential-free probe.
- The Java host checks and release metadata checks passed. Python discovered 63 tests and passed 55. The other eight require cryptography, which this host's Python does not have.
- The production PeerServer returned a 36-character identity on its HTTPS ID endpoint. This verifies anonymous reachability, not a WebRTC pairing.
- The previous screenshot commit passed [source CI](https://github.com/Xarber/Aurea-Home/actions/runs/43842234546). The new landing badge browser assertion needs a fresh export.
- Native runtime evidence remains open. ADB listed no attached devices. No usable local iOS simulator tool was available. Fresh native captures and capture/export packaging are pending. The Android package and iOS archive were not started under §8 while independent preparation remains.

## Follow-up

Testing source checks passed in [run 43845977763](https://github.com/Xarber/Aurea-Home/actions/runs/43845977763). The local verification build included the badge assets and developer presets. Chromium passed all 38 tests, including mocked HTTPS reachability, preset persistence, explicit switching and default restoration after reload. The PWA update test passed. The JavaScript budget passed at 1,850,989 of 2,200,000 bytes. Browser screenshots were captured from the launcher and remote previews and have version/dimension/checksum receipts. Local export metadata reported commit `local`.

The Expo public config still reports `it.xarber.aurea.remote` for iOS and Android. The Expo SDK 58 package map selects ViewShot 6.1.1 for sample-only native PNG sharing. Compilation and actual export remain unverified on devices.
