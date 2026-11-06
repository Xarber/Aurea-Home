# Android phone R8 failure — 2026-11-06

Run 42140949716 passed TV APK/AAB, both iOS packages, browser/PWA, source and dependency checks. Only Android phone APK/AAB failed at `:app:minifyReleaseWithR8` with missing `org.webrtc.Dav1dDecoder$Natives`.

The published Maven `org.jitsi:webrtc` 155.0.0 and 155.0.1 AARs were inspected. Both ship `libs/libwebrtc.jar` containing generated `Dav1dDecoderJni.class` but no Dav1dDecoder or its Natives interface. Searching the jar's class constants found only the orphan bridge and GEN_JNI referencing that decoder; GEN_JNI only declares its native entry point. SoftwareVideoDecoderFactory uses its separate native factory. Aurea uses WebRTC data channels, not this optional AV1 decoder. Inspected 155.0.1 libwebrtc.jar SHA-256: `3a13ea34f793aa595857988a2350cedb7f19b3c9ad4efe6a9722a95d00ab7b6c`.

A phone-only ProGuard file now suppresses exactly the missing optional Natives type. No broad WebRTC warning suppression or fake decoder implementation is introduced. Dependency resolution pins 155.0.1 instead of inheriting the upstream `155.+` request. TV and iOS implementations are unchanged.

Manual workflow inputs select Android targets and whether iOS is required. Defaults preserve full builds. Partial manual builds cannot publish even on beta/main. Summary validation still fails missing/failed requested stages; full builds continue to require iOS. This permits a phone-only retry without rebuilding the already successful macOS jobs.

Validation: exact failure confirmed in both job logs; actual AAR/class reference inspection and javap performed; release consistency and host checks passed. Summary cases passed for successful partial Android, rejected incomplete full build, and failed required Android. Android native recompilation is delegated to the new targeted workflow, not claimed successful in advance. No device installation or release publication occurred.
