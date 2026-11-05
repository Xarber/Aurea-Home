// SPDX-License-Identifier: AGPL-3.0-only
import { File, Paths } from "expo-file-system";
import { empty, parseCollection, type Collection } from "./model.ts";
const slot = (index: number) =>
  new File(Paths.document, "aurea-ideas-" + index + ".json");
export async function loadIdeas(): Promise<Collection> {
  const valid: Collection[] = [];
  let found = false;
  for (let i = 0; i < 2; i++) {
    const file = slot(i);
    if (!file.exists) continue;
    found = true;
    try {
      valid.push(parseCollection(await file.text()));
    } catch {
      /* The other journal slot remains a recovery copy. */
    }
  }
  if (found && !valid.length)
    throw Error(
      "Ideas storage could not be read. Existing files were preserved.",
    );
  return valid.sort((a, b) => b.revision - a.revision)[0] ?? empty();
}
let queue: Promise<unknown> = Promise.resolve();
export function updateIdeas(
  action: (current: Collection) => Collection,
): Promise<Collection> {
  const task = queue
    .catch(() => {})
    .then(async () => {
      const current = await loadIdeas(),
        next = action(current);
      next.revision = current.revision + 1;
      next.exportedAt = new Date().toISOString();
      const encoded = JSON.stringify(next);
      parseCollection(encoded);
      slot(next.revision % 2).write(encoded);
      return next;
    });
  queue = task;
  return task;
}
