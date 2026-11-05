# Developer Ideas

Ideas is an offline developer notebook shared by the Android TV launcher, phone companion and web preview. It is accessible through Developer Options after the existing version gesture. It never sends notebook content through the remote API, PeerServer, analytics or GitHub automatically. No account is required. The preview does not fabricate entries or insert demo records.

## Interface and lifecycle

Create/edit title, description, optional reproduction steps, category, priority and status. Categories are Feature, Improvement, Bug Fix, UI/UX, Performance and Other. Statuses are Pending, Approved, Deferred, In Progress, Implemented and Rejected. Every edit preserves stable identity, creation time and a timestamped status/history entry. Duplicate creates a new Pending record without implementation claims. Deletion requires selecting records and confirming. Search title/body/reproduction, filter status/category, and sort by update time/title/priority. Batch status updates exclude Implemented because that requires individual verification references. Explicit clipboard copy, individual sharing and selected/full JSON or Markdown exports are available.

Implemented requires an explicit commit, version and ISO verification timestamp. Optional PR and changelog references remain with the entry. Reopening preserves those references/history. View changelog opens the app's bundled release history. Changelog is generated from the canonical structured release source; pending notebook records never become release notes automatically.

## Storage and recovery

`src/developer/ideas/model.ts` owns the versioned schema, validation, lifecycle, merge policy and Markdown conversion. UI, file interaction and persistence are separate modules. Web stores an atomic JSON collection at localStorage key `aurea.developer.ideas.v1`; writes are serialized and use Web Locks when available. Storage errors remain visible and do not replace saved content with an empty list. Native uses two revisioned files `aurea-ideas-0.json` / `aurea-ideas-1.json` in the application's documents directory. A save writes the older slot; startup selects the newest valid revision, recovering from an interrupted write through the other slot. If neither existing slot parses, existing files are preserved and an error is shown. Ordinary updates do not delete either slot. Native provider/TV file-picker support varies; share/export errors are shown, with native text sharing fallback.

This is local-first storage, not encrypted secret storage. Users should avoid placing credentials in notes. Content stays on the device until explicit export/share. No automatic cross-device notebook synchronization is claimed. Each installation/origin has an independent collection.

## Interchange

JSON contains schema=1, project="aurea", exportedAt, revision and ideas[]. Each idea includes id, title, description, reproduction, category, priority, status, createdAt, modifiedAt, history and optional implementation. Files are bounded to 4 MB / 1000 entries; strings/history/statuses/identifiers/references are validated. Unknown schema/project, duplicate IDs and unverified Implemented entries are rejected before changing local data.

Import always opens a review. New IDs are added; existing IDs are preserved by default. Conflicts show incoming descriptions/status and require selecting "Use incoming version" before replacement. Incoming and saved histories are retained. No imported file can delete a local record. Concurrent local edits are detected before overwriting an open editor; edits must be reloaded. JSON is the lossless interchange; Markdown is a readable export.

## Agent workflow and privacy

`docs/IDEAS.json` is the standardized repository collection, initially empty. `node --experimental-strip-types scripts/ideas.mjs` validates it, summarizes outstanding statuses and verifies whether referenced commits exist; it does not silently mark anything Implemented. For a user-exported file, run the script with the path to preview additions/conflicts. Writing requires `--apply --allow-public-source`, deliberately acknowledging that this repository is public; existing conflicting ideas remain unchanged. Never import private notes into public source without explicit review/authorization.

Agents must review available ideas at session start, identify related/already implemented work, and ask which unrelated ideas to select now or defer. Keep unselected ideas. New/changed-since-last-review reporting needs an actual prior review baseline; do not invent one. App-private collections cannot be read automatically without an authorized export/transport. The committed empty collection is not evidence that the user's devices contain no ideas.

After a selected idea is verified, record exact commit/version/verifiedAt, update the canonical structured release metadata with truthful user-facing notes and retain its implementation references. Do not publish private notebook titles/descriptions by default.

## Validation boundaries

Unit tests exercise schema/lifecycle, malformed imports, duplicate detection, safe conflict merges, persistence/reload, concurrent writes and write failure. Browser interaction tests cover capture/edit/export/import review and developer entry points. Native file picker, phone share sheets, TV keyboard entry and native restart recovery still require target-device verification. No on-device notebook has been retrieved or published as part of initial implementation.
