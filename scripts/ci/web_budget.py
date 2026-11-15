#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
"""Check the uncompressed browser JavaScript budget after a production export."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
limit = json.loads((ROOT / "config/performance-budgets.json").read_text())["web"]["exportedJavaScriptBytes"]
bundles = list((ROOT / "dist/_expo/static/js/web").glob("*.js"))
if not bundles:
    raise SystemExit("No Expo web JavaScript found. Export the web build first.")
total = sum(bundle.stat().st_size for bundle in bundles)
print(f"Expo web JavaScript: {total} of {limit} bytes (uncompressed, including lazy bundles)")
if total > limit:
    raise SystemExit("Web JavaScript budget exceeded")
