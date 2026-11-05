// SPDX-License-Identifier: AGPL-3.0-only
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  empty,
  newIdea,
  changeIdea,
  parseCollection,
  mergeIdeas,
  markdown,
} from "../../src/developer/ideas/model.ts";
const idea = () => ({
  ...newIdea(),
  title: "Improve source selector",
  description: "Keep the custom source name",
});
test("ideas retain stable identities and status history across portable export", () => {
  const first = idea(),
    approved = changeIdea(first, { status: "Approved" }),
    deferred = changeIdea(approved, { status: "Deferred" });
  const file = parseCollection(
    JSON.stringify({ ...empty(), ideas: [deferred] }),
  );
  assert.equal(file.ideas[0]?.id, first.id);
  assert.deepEqual(
    file.ideas[0]?.history.map((event) => event.status),
    ["Pending", "Approved", "Deferred"],
  );
  assert.match(markdown(file), /Improve source selector/);
});
test("imports preserve saved conflicts until individually reviewed and keep both histories", () => {
  const saved = idea(),
    remote = changeIdea(saved, { title: "Incoming title" });
  const original = { ...empty(), ideas: [saved] },
    incoming = { ...empty(), ideas: [remote, idea()] };
  const kept = mergeIdeas(original, incoming);
  assert.equal(kept.ideas.length, 2);
  assert.equal(kept.ideas[0]?.title, saved.title);
  const replaced = mergeIdeas(original, incoming, new Set([saved.id]));
  assert.equal(replaced.ideas[0]?.title, remote.title);
  assert.ok(replaced.ideas[0]!.history.length > saved.history.length);
});
test("malformed files, duplicate identifiers and unverified implementation states are rejected", () => {
  const first = idea();
  for (const value of [
    { ...empty(), schema: 2 },
    { ...empty(), project: "another-app" },
    { ...empty(), ideas: [first, first] },
    { ...empty(), ideas: [{ ...first, status: "Implemented" }] },
  ])
    assert.throws(() => parseCollection(JSON.stringify(value)));
  const done = changeIdea(first, {
    status: "Implemented",
    implementation: {
      commit: "a".repeat(40),
      version: "2.1.1",
      verifiedAt: new Date().toISOString(),
    },
  });
  assert.equal(done.status, "Implemented");
  assert.equal(changeIdea(done, { status: "Pending" }).status, "Pending");
});
test("web ideas survive reload and failed saves preserve previous data", async () => {
  const items = new Map<string, string>();
  let fail = false;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (fail) throw Error("quota");
        items.set(key, value);
      },
    },
  });
  const { loadIdeas, updateIdeas } =
    await import("../../src/developer/ideas/storage.ts");
  const first = idea();
  await updateIdeas((current) => ({ ...current, ideas: [first] }));
  assert.equal((await loadIdeas()).ideas[0]?.id, first.id);
  fail = true;
  await assert.rejects(updateIdeas((current) => ({ ...current, ideas: [] })));
  assert.equal((await loadIdeas()).ideas.length, 1);
  fail = false;
  await Promise.all([
    updateIdeas((current) => ({
      ...current,
      ideas: [...current.ideas, idea()],
    })),
    updateIdeas((current) => ({
      ...current,
      ideas: [...current.ideas, idea()],
    })),
  ]);
  assert.equal((await loadIdeas()).ideas.length, 3);
});
