# Pairing, microphone and updated development standards — 2026-11-05

## Scope and implementation

Reviewed the selected-TV system-pairing UI, existing per-host phone TLS identity, shared voice controller, Swift microphone capture, Developer Options, local persistence and structured changelog/build metadata. This was not a full audit of every application module.

- Pairing shows progress before a code is ready, names the current TV and explains the first-request delay. A system-controls action/status now lives in the existing connection line, preserving handset height. Switching TVs clears stale code/success UI; per-host SecureStore identities remain separate.
- Swift microphone Stop clears actual Data indices after removeFirst instead of an invalid zero-based range. Repeated Stop is idempotent; lifecycle audio-engine cleanup runs on main. Shared controller cleanup errors return idle and end the TV session without unhandled rejections. Missing initial PCM now produces a bounded error rather than indefinite recording feedback.
- Updated universal instructions were read, including new section 35. Developer Ideas now works in TV Home, phone and web Developer Options: local persistence, categories/priorities/status history, search/filter/sort, editing/duplication, selection/batch changes, confirmed deletion, clipboard/sharing, JSON/Markdown export and reviewed JSON imports. Existing conflicts stay saved by default. Native two-slot storage preserves a valid prior revision through interrupted writes.
- Repository `docs/IDEAS.json` is empty: 0 Pending, 0 Approved, 0 Deferred. Agent retrieval/summary tooling and AGENTS instructions were added. No device-private idea collection was retrieved or published. No prior review baseline exists, so no fabricated "new since last review" count is reported.
- Implemented ideas require verification/commit/version references and can open the bundled structured changelog. A generated release-history asset replaces the phone's stale fixed changelog text. Version is 2.1.1/code 37. No automatic notebook networking/synchronization, public notes upload, account or paid service was introduced.

The existing blur implementation, TV package/signing identity, saved settings and Recovery Home remain intact. New module versions match Expo 58's bundled native module recommendations; no framework upgrade or OS baseline change was made.

## Executed checks

- TypeScript passed.
- Shared tests: **53 passed**, covering direct TLS/voice framing, cleanup failure, missing PCM feedback, idea validation/status transitions, duplicate IDs, conflict merge/history, web persistence/reload/failed and concurrent saves, and native two-slot interrupted-write recovery through host file adapters.
- Host suite passed: **62 Python cases, 8 optional crypto skips** on the default host Python; existing Java/metadata/license checks also passed.
- Production web export and PWA update/reload/restore checks passed. Browser suite: **34 passed** on headless desktop Chrome, including phone/tablet viewports, Ideas capture/export/import/reload, delayed pairing feedback, handset fit, keyboard/touch controls and synthetic browser microphone transport.
- Actual Swift AVAudioConverter processed synthetic source samples into nonzero 8 kHz mono Int16 PCM on macOS. `node scripts/phone/check_voice_capture.mjs` also passed the actual Swift capture append/encryption/stop code, OAEP/AES-GCM decryption, residual audio and repeated Stop after nonzero Data indices. iOS-only AVAudioSession setup/hardware capture is excluded from that host probe; it does not record audio.
- Ideas browser screenshot was visually inspected. Existing native/phone physical verification was not performed. Native picker/share/clipboard, TV keyboard entry and physical restart recovery remain target checks.

An initial browser test hit an unrelated service already occupying the default port; tests were rerun on isolated ports without changing that service. A broader pass caught the extra status row making the handset too tall, which was fixed by using the existing connection line. Old preview tests were updated for the required three-tap → Developer Options toggle workflow. Concurrent test artifact directories caused one diagnostic error; the final complete browser suite ran alone and passed. No test assertion was relaxed to hide a layout failure.

## Remaining physical validation and publication

The user confirmed direct Spotify AirPlay works after reboot; no speculative AirPlay engine change was made. Audible iPhone microphone delivery to Assistant still requires the new native binary and a real device test. Host crypto/protocol success is not evidence of recognized speech on the TV.

Work is integrated on `testing`. A manual all-platform workflow produces TV APK/AAB, phone APK/AAB, unsigned iOS IPA and iOS Simulator artifacts. Submitted/running builds are not completed releases. No automatic installation, stable promotion or production web deployment is part of this batch. Existing worktrees and protected/user branches are preserved; no temporary feature branch was created.
