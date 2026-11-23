# Release archive and onboarding verification

UADS §§16, 17, 37, 40 and 44 apply to this batch. The source provides a versioned overview, full notes and gated technical notes. The archive covers 28 version records. GitHub's published-release records and remote tags confirmed six historical publications across four product versions. Remaining historical records are explicitly reconstructed, while the current release record remains a development entry. No release tags or assets were republished.

- Browser export at `356da3a`. All 41 Chromium/Chrome Playwright tests passed. Regressions cover fresh tour entry and completion, a returning user with skipped versions, acknowledgment after dismissal, direct links to historical editions and distinguishing beta publication from reconstructed history.
- A separate short-viewport browser check passed with enlarged copy, Back, Skip and persistence after reload.
- TypeScript and 63 Expo source tests passed. The five account tests passed. The host check completed with eight unrelated protocol tests skipped for missing local dependencies. The structural UADS check validated 53 requirement entries.
- Captured and visually reviewed the real browser tour and historical notes at 1440 × 900 and 390 × 844. [Capture receipt](2026-11-23-release-history-captures.json).
- Native compilation and fresh/run-upgrade device checks remain open for this revision. Match phone, tablet and TV screenshots to actual device builds. Browser captures are labeled as browser evidence.

[Source quality](https://github.com/Xarber/Aurea-Home/actions/runs/45264899057) passed at `ac237ab`. The [replacement native workflow](https://github.com/Xarber/Aurea-Home/actions/runs/45264926157) was accepted for that same revision.
