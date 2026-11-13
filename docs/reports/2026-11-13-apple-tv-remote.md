# Apple TV remote validation

Scope covers paired Apple TV navigation and app discovery, authenticated phone routing, launcher receiver preferences, and the native launcher loading state.

- TypeScript and 59 Node tests passed during development.
- Host checks passed. Python reported 63 tests with eight optional cryptography skips.
- Production Expo/PWA export and 11 targeted Chrome tests passed during development. The Apple TV browser fixture exercises Music, Apple TV Home, Aurea Home and the Inputs tab.
- Physical Companion PIN pairing, app launch, AirPlay discovery after renaming, and receiver-off behavior remain unverified on hardware.
