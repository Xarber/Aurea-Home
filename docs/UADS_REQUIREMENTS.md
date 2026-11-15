# Aurea UADS baseline

This repository labels the supplied sections 1–52 as `sections-1-52` because no standards version number was supplied. The user's UADS text remains authoritative. The registry assigns stable IDs to all 52 section groups. Add individual check IDs beneath these groups when finer enforcement is needed.

Read `uads.json` for scope, applicability and evidence pointers. Pending entries are assessments in progress. Passing structural validation does not verify the referenced product behavior.

Run `python scripts/validate-uads.py` with jsonschema 4.25.1. The lightweight GitHub workflow checks governance and production npm advisories. Existing build workflows retain platform lint, native packages, test suites and artifact verification. See [Testing](TESTING.md), [Security](SECURITY.md) and [Releases](RELEASES.md).

The budgets in `config/performance-budgets.json` are initial targets. Measure web vitals on representative devices, native startup from a cold process to interactive focus, and signaling readiness against X-Center. Native measurements and changed-line and branch coverage evidence remain pending.
