# Aurea development queue

Process oldest actionable requests first. When hardware blocks verification, record the dependency and continue with the next item. Update this ledger on material state changes and retain completed entries. No repository Ideas were pending at the November 15 review.

| Order / ID | Original scope | Priority and dependencies | State and evidence | Next action |
|---|---|---|---|---|
| 1 / AUREA-001 | Apple TV app launch, navigation, phone mode, receiver settings and boot preview | High. Hardware verification needs an Android TV and a compatible Apple TV on the same network. | Implemented in `8813a4d`. Build 43505896531 and browser/host checks passed. | Verify Companion PIN, app list, Music launch, both Home buttons, input switching, receiver rename and disable on devices. |
| 2 / AUREA-002 | Check the 2.3.0 builds and fix any failures | High. Depends on Actions results. | Verified. All six native jobs and artifact listings checked in run 43505896531. | None. |
| 3 / AUREA-003 | Apply the new UADS and verify the quality workflow | High. Source checks can run independently of native packages. | In Progress. Run 43732569625 passed governance and source checks and failed the dependency audit. The lockfile fix `d993182` passed the local high-severity gate. | Push the fixes and verify the replacement source-quality run. |
| 4 / AUREA-004 | Complete the applicable UADS product gaps | Normal. Landing and onboarding can proceed before device capture; platform-specific images need matching runtimes. | In Progress. The hosted landing, stable downloads and web introduction passed the focused Chromium flow. | Finish alternate installation badges and device installation checks. Continue with native onboarding, screenshot tools, developer server configuration and remaining quality and release evidence. |
