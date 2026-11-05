// SPDX-License-Identifier: AGPL-3.0-only
import { empty, parseCollection, type Collection } from "./model.ts";
const key = "aurea.developer.ideas.v1";
export async function loadIdeas(): Promise<Collection> {
  const value = localStorage.getItem(key);
  return value ? parseCollection(value) : empty();
}
let queue: Promise<unknown> = Promise.resolve();
export function updateIdeas(
  action: (current: Collection) => Collection,
): Promise<Collection> {
  const run = async () => {
    const current = await loadIdeas(),
      next = action(current);
    next.revision = current.revision + 1;
    next.exportedAt = new Date().toISOString();
    const encoded = JSON.stringify(next);
    parseCollection(encoded);
    localStorage.setItem(key, encoded);
    return next;
  };
  const task = queue
    .catch(() => {})
    .then(() => (navigator.locks ? navigator.locks.request(key, run) : run()));
  queue = task;
  return task;
}
