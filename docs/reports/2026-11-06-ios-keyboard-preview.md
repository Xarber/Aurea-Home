# iPhone launch, keyboard and private app preview — 2026-11-06

## Scope and changes

Reviewed the reported iOS dynamic-linker failure, native system-control IME messages, selected-TV remote UI, Android capture consent/lifecycle, scoped media authorization, peer runtime, playback adapters and build packaging. This is not a whole-application audit.

The exact ExpoModulesJSI missing-symbol error was reproduced by examining the downloaded 2.1.1 IPA's actual framework imports/exports. The package contained three incompatible JSI imports, including the reported Slot.emplace symbol. iOS now opts out of precompiled Expo modules in both app configuration and CI environment; the build verifies this configuration and packaging rejects unresolved ExpoModulesJSI imports. React Native remains on its existing version/prebuilt strategy. No signing identity or package identifier changed. New native output must still pass CI and launch on a device; a completed compile is not launch proof.

Native remote IME support negotiates the keyboard feature, consumes TV field counters/show requests, opens the phone input panel and sends explicit bounded text over the existing pinned TLS connection. Text is cleared on close/TV change and is not persisted or logged. Browser directional-key passthrough remains intact; automatic TV field integration is native-only.

The user explicitly chose an app-only preview with TV approval after HDMI/protected-content limits were explained. MediaProjection captures low-rate app snapshots; AudioPlaybackCapture adds eligible app sound when Android permits it. A separate, owner-bound, expiring ticket and server-only relay proof protect the media routes. Only WebRTC carries media. Capture requires fresh on-TV explanation/system approval, has an ongoing Stop notification, a two-minute hard bound and an eight-second viewer idle bound. Pending approval also expires and is tied to its exact request. Parent unpair/revoke and service shutdown cancel pending/active capture. App selection and navigation remain on the original remote connection.

Native phones use react-native-webrtc 155.0.1 for data channels, loaded only when a peer connection is needed; the TV host excludes the native dependency. Viewing never invokes the phone's camera/microphone/screen-capture APIs. Native audio playback uses bounded platform buffers. Transient hosted preview connections do not change the saved hosted-remote preference. Details and the existing LAN HTTP bootstrap limitation are documented in PRIVATE_APP_PREVIEW.md.

Version is 2.2.0 / code 38. Existing blur, dock/layout, legacy Recovery Home, identifiers, preferences and signing continuity are preserved. Ideas review found zero repository entries; no device-private notes were fetched or published.

## Validation and boundaries

- TypeScript and production web export passed.
- All **57 shared tests** passed, including real TLS IME field counters/text payload and synthetic preview denial, invalid endpoint rejection, cancellation, audio sequence deduplication and pixel cleanup.
- Host checks passed: **62 Python cases, eight optional crypto skips**, existing Java checks and new preview access/lease checks. Policy checks reject expired/revoked/forged/plain-HTTP media access.
- Capture, server and relay Java compiled against the then-installed Android SDK using narrow host-service stubs during implementation. The local SDK was no longer present on November 6, so the final native compile belongs to CI; no SDK was reinstalled.
- The TV's standard MediaProjection consent activity was discovered through read-only ADB. No capture permission was granted, no recording made, and no new APK installed on the TV.
- All **35 browser tests** passed on headless Chrome, including existing remote/layout/touch regressions and the private-preview UI refusing an invalid endpoint without opening a media connection. PWA manifest/update/reload checks passed. These checks do not validate physical capture or native playback.

Physical iPhone launch, native IME behavior in real apps, TV consent/capture, capture-eligible sound and native peer playback remain unverified until the new binary is installed and tested by the user. HDMI and protected video are unsupported; app audio can be blocked. The preview is bounded best-effort snapshots/audio, not frame-synchronous high-quality video.

## Git/build/deployment

Completed changes land on testing with Conventional Commits. A manual all-platform workflow is used for TV APK/AAB, phone APK/AAB, iOS unsigned IPA and iOS Simulator. No stable promotion, automatic installation or web production replacement is performed. No temporary branch/worktree was created; existing protected and user worktrees remain intact.
