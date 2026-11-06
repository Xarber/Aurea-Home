# Remote session recovery — 2026-11-06

Scope: phone remote client, native TLS/IME adapter, microphone button lifecycle, TV selector, keyboard panel and private-preview visibility. No TV receiver, blur implementation, legacy Home, identity/signing or user data changes.

Implemented: separate native system status/recovery from Home HTTP; saved buttons/voice work without Home; per-TV setup on dedicated TVs tab; inactive iOS does not stop recording; synchronous microphone start guard; automatic field-status handling and immediate serialized insert/delete edits; private capture UI hidden with code retained. Version 2.2.1/code39.

Initial checks: TypeScript passed; 59 host tests passed, including two consecutive real local TLS microphone sessions, native buttons/voice without Home, IME deltas and TV-switch rejection. All 17 remote browser checks passed against a production export in headless desktop Chrome, including phone/tablet layouts, saved TV switching, pairing progress, touchpad, keyboard navigation and hidden capture. Local protocol servers are test doubles, not a physical Android TV.

Physical iPhone microphone repetition, automatic keyboard presentation, TV-app IME semantics and Android phone runtime remain unverified. No device installation or production deployment performed. The previous targeted Android retry (42163413202) succeeded for both phone APK/AAB; it predates this implementation. New native build status will be reported separately.

Final batch checks: production Expo web/PWA export passed; TypeScript and all 59 Node tests passed; full browser suite passed 35/35 on headless Chrome. Host policy/Java checks passed, including updater, pairing lifetime, pause timeout, remote key scope, release consistency and preview access. Python ran 62 tests with 8 optional-crypto skips under the default interpreter. Native TLS tests independently exercised real cryptography. iOS build number and Android version code are both 39. No temporary branches/worktrees were created.
