// SPDX-License-Identifier: AGPL-3.0-only
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as model from "../../src/developer/ideas/model.ts";
test("native two-slot idea journal recovers interrupted writes and preserves unreadable files", async () => {
  const disk = new Map();
  let interrupted = false;
  class File {
    constructor(_directory, name) {
      this.name = name;
    }
    get exists() {
      return disk.has(this.name);
    }
    async text() {
      return disk.get(this.name);
    }
    write(value) {
      disk.set(this.name, interrupted ? "{" : value);
      if (interrupted) throw Error("interrupted write");
    }
  }
  const source = readFileSync(
      new URL("../../src/developer/ideas/storage.native.ts", import.meta.url),
      "utf8",
    ),
    output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    module = { exports: {} };
  new Function("require", "exports", "module", output)(
    (name) =>
      name === "expo-file-system"
        ? { File, Paths: { document: "private" } }
        : model,
    module.exports,
    module,
  );
  const { loadIdeas, updateIdeas } = module.exports;
  const one = { ...model.newIdea(), title: "First local observation" };
  await updateIdeas((current) => ({ ...current, ideas: [one] }));
  await updateIdeas((current) => ({
    ...current,
    ideas: [
      ...current.ideas,
      { ...model.newIdea(), title: "Second observation" },
    ],
  }));
  interrupted = true;
  await assert.rejects(updateIdeas((current) => ({ ...current, ideas: [] })));
  const restored = await loadIdeas();
  assert.equal(restored.ideas.length, 2);
  assert.equal(restored.revision, 2);
  for (const key of disk.keys()) disk.set(key, "{");
  await assert.rejects(loadIdeas());
  assert.equal(disk.size, 2);
});
