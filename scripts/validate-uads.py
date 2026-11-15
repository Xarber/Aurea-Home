#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
"""Validate governance metadata. Product compliance requires separate evidence."""
import json
import sys
from datetime import date
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text())


def check(condition, message):
    if not condition:
        raise ValueError(message)


def local_reference(path):
    reference = (ROOT / path).resolve()
    check(reference != ROOT and ROOT in reference.parents and reference.exists(),
          f"Missing or invalid repository reference: {path}")


def indexed(records):
    result = {record["id"]: record for record in records}
    check(len(result) == len(records), "Duplicate UADS identifier")
    return result


def validate():
    manifest = read("uads.json")
    schema = read("config/uads-schema.json")
    Draft202012Validator.check_schema(schema)
    Draft202012Validator(schema, format_checker=FormatChecker()).validate(manifest)
    registry = indexed(read("config/uads-requirements.json")["requirements"])
    check({record["section"] for record in registry.values()} == set(range(1, 51)),
          "Registry must cover every section of this baseline")
    declarations = indexed(manifest["requirements"])
    check(declarations.keys() == registry.keys(), "Manifest and registry IDs differ")
    exceptions = indexed(manifest["exceptions"])
    check(exceptions.keys() <= declarations.keys(), "Unknown exception requirement")
    for key, item in declarations.items():
        for path in item["evidence"]:
            local_reference(path)
        for dependency in registry[key]["dependencies"]:
            check(dependency in registry and dependency != key, f"Invalid dependency for {key}")
        local_reference(registry[key]["requiredEvidence"])
        waived = key in exceptions
        check(waived == (item["applicability"] == "Approved Exception") == (item["state"] == "Waived"),
              f"Inconsistent exception: {key}")
        check((item["state"] == "Not Applicable") == (item["applicability"] == "Not Applicable"),
              f"Inconsistent applicability: {key}")
        if item["state"] == "Passed":
            check(any(path.startswith("docs/reports/") and (ROOT / path).is_file()
                      for path in item["evidence"]), f"Missing execution report for {key}")
        if waived:
            record = exceptions[key]
            check(date.fromisoformat(record["approvedOn"]) <= date.today() <= date.fromisoformat(record["reviewOn"]),
                  f"Exception is outside its approved period: {key}")
            check(set(record["platforms"]) <= set(manifest["project"]["platforms"]),
                  f"Exception platform mismatch: {key}")
    for path in manifest["quality"].values():
        local_reference(path)
    budgets = read(manifest["quality"]["performance"])
    for group in ("web", "androidTv", "phone", "signaling"):
        check(budgets[group] and all(type(value) in (int, float) and 0 < value < float("inf")
                                    for value in budgets[group].values()), f"Invalid budget group: {group}")
    release = read(manifest["quality"]["release"])
    check(release["promotion"] == ["testing", "beta", "main"], "Invalid promotion sequence")
    for field in ("history", "workflow", "artifactValidator", "publishedVerifier", "distributionDirectory"):
        local_reference(release[field])
    print(f"Validated UADS configuration and references for {len(declarations)} requirements.")


if __name__ == "__main__":
    try:
        validate()
    except Exception as error:
        print(f"UADS validation failed: {error}", file=sys.stderr)
        sys.exit(1)
