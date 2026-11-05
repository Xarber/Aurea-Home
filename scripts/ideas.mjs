#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parseCollection, mergeIdeas } from "../src/developer/ideas/model.ts";
const path = new URL("../docs/IDEAS.json", import.meta.url),
  args = process.argv.slice(2),
  local = parseCollection(readFileSync(path, "utf8"));
const file = args.find((value) => !value.startsWith("--"));
if (file) {
  const incoming = parseCollection(readFileSync(file, "utf8"));
  const conflicts = incoming.ideas.filter((idea) =>
    local.ideas.some(
      (saved) =>
        saved.id === idea.id && JSON.stringify(saved) !== JSON.stringify(idea),
    ),
  );
  console.log(
    JSON.stringify(
      {
        new: incoming.ideas.filter(
          (idea) => !local.ideas.some((saved) => saved.id === idea.id),
        ).length,
        conflicts: conflicts.map((idea) => ({
          id: idea.id,
          title: idea.title,
        })),
        policy:
          "Existing ideas are preserved. This repository is public; review private content before importing.",
      },
      null,
      2,
    ),
  );
  if (args.includes("--apply")) {
    if (!args.includes("--allow-public-source"))
      throw Error(
        "Review content and explicitly pass --allow-public-source before writing to this public repository.",
      );
    writeFileSync(
      path,
      JSON.stringify(mergeIdeas(local, incoming), null, 2) + "\n",
    );
  }
}
const collection = parseCollection(readFileSync(path, "utf8"));
for (const status of ["Pending", "Approved", "Deferred", "In Progress"])
  console.log(
    status +
      ": " +
      collection.ideas.filter((idea) => idea.status === status).length,
  );
for (const idea of collection.ideas) {
  let commitExists = false;
  if (idea.implementation?.commit)
    try {
      execFileSync(
        "git",
        ["cat-file", "-e", idea.implementation.commit + "^{commit}"],
        { stdio: "ignore" },
      );
      commitExists = true;
    } catch {}
  console.log(
    JSON.stringify({
      id: idea.id,
      title: idea.title,
      status: idea.status,
      modifiedAt: idea.modifiedAt,
      implementationCommitExists: commitExists,
    }),
  );
}
console.log(
  "Source: repository file only. On-device collections have not been retrieved. Do not implement unselected ideas automatically.",
);
