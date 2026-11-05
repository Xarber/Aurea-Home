// SPDX-License-Identifier: AGPL-3.0-only
export const statuses = [
  "Pending",
  "Approved",
  "Deferred",
  "In Progress",
  "Implemented",
  "Rejected",
] as const;
export const categories = [
  "Feature",
  "Improvement",
  "Bug Fix",
  "UI/UX",
  "Performance",
  "Other",
] as const;
export type Status = (typeof statuses)[number];
export interface Reference {
  commit?: string;
  pullRequest?: string;
  version?: string;
  changelog?: string;
  verifiedAt?: string;
}
export interface Idea {
  id: string;
  title: string;
  description: string;
  reproduction: string;
  category: (typeof categories)[number];
  priority: "None" | "Low" | "Medium" | "High";
  status: Status;
  createdAt: string;
  modifiedAt: string;
  history: { at: string; status: Status; note: string }[];
  implementation?: Reference;
}
export interface Collection {
  schema: 1;
  project: "aurea";
  exportedAt: string;
  revision: number;
  ideas: Idea[];
}
export const empty = (): Collection => ({
  schema: 1,
  project: "aurea",
  exportedAt: new Date().toISOString(),
  revision: 0,
  ideas: [],
});
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max;
const date = (value: unknown): value is string =>
  text(value, 40) && Number.isFinite(Date.parse(value));
export function parseCollection(encoded: string): Collection {
  if (encoded.length > 4_000_000) throw Error("Ideas file is too large");
  const data = JSON.parse(encoded) as Collection;
  if (
    data.schema !== 1 ||
    data.project !== "aurea" ||
    !date(data.exportedAt) ||
    !Number.isSafeInteger(data.revision) ||
    data.revision < 0 ||
    !Array.isArray(data.ideas) ||
    data.ideas.length > 1000
  )
    throw Error("Unsupported Ideas file");
  const ids = new Set<string>();
  for (const idea of data.ideas) {
    if (
      !idea ||
      !text(idea.id, 100) ||
      !/^idea-[a-zA-Z0-9-]+$/.test(idea.id) ||
      ids.has(idea.id) ||
      !text(idea.title, 200) ||
      !idea.title.trim() ||
      !text(idea.description, 16000) ||
      !text(idea.reproduction, 8000) ||
      !categories.includes(idea.category) ||
      !statuses.includes(idea.status) ||
      !["None", "Low", "Medium", "High"].includes(idea.priority) ||
      !date(idea.createdAt) ||
      !date(idea.modifiedAt) ||
      !Array.isArray(idea.history) ||
      idea.history.length > 1000
    )
      throw Error("Invalid or duplicate idea");
    ids.add(idea.id);
    for (const event of idea.history)
      if (
        !date(event.at) ||
        !statuses.includes(event.status) ||
        !text(event.note, 1000)
      )
        throw Error("Invalid idea history");
    const ref = idea.implementation;
    if (ref) {
      if (
        typeof ref !== "object" ||
        Array.isArray(ref) ||
        Object.entries(ref).some(
          ([key, value]) =>
            ![
              "commit",
              "pullRequest",
              "version",
              "changelog",
              "verifiedAt",
            ].includes(key) || !text(value, 500),
        )
      )
        throw Error("Invalid implementation reference");
      if (ref.commit && !/^[a-f0-9]{7,40}$/.test(ref.commit))
        throw Error("Invalid commit reference");
      if (ref.verifiedAt && !date(ref.verifiedAt))
        throw Error("Invalid verification date");
    }
    if (
      idea.status === "Implemented" &&
      (!ref?.verifiedAt || !ref.version || !ref.commit)
    )
      throw Error(
        "Implemented ideas need verified commit and version references",
      );
  }
  return data;
}
export function newIdea(): Idea {
  const now = new Date().toISOString();
  return {
    id:
      "idea-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2) +
      "-" +
      Math.random().toString(36).slice(2),
    title: "",
    description: "",
    reproduction: "",
    category: "Feature",
    priority: "None",
    status: "Pending",
    createdAt: now,
    modifiedAt: now,
    history: [{ at: now, status: "Pending", note: "Created locally" }],
  };
}
export function changeIdea(
  idea: Idea,
  changes: Partial<Idea>,
  note = "Edited locally",
): Idea {
  const now = new Date().toISOString();
  const next = {
    ...idea,
    ...changes,
    id: idea.id,
    createdAt: idea.createdAt,
    modifiedAt: now,
    history: [
      ...(changes.history ?? idea.history),
      { at: now, status: changes.status ?? idea.status, note },
    ],
  };
  parseCollection(JSON.stringify({ ...empty(), ideas: [next] }));
  return next;
}
export function mergeIdeas(
  local: Collection,
  incoming: Collection,
  replace: Set<string> = new Set(),
): Collection {
  const ideas = [...local.ideas];
  for (const idea of incoming.ideas) {
    const index = ideas.findIndex((saved) => saved.id === idea.id);
    if (index < 0) ideas.push(idea);
    else if (
      replace.has(idea.id) &&
      JSON.stringify(ideas[index]) !== JSON.stringify(idea)
    ) {
      const saved = ideas[index]!;
      ideas[index] = changeIdea(
        saved,
        { ...idea, history: [...saved.history, ...idea.history] },
        "Imported after explicit conflict review",
      );
    }
  }
  const next = { ...empty(), revision: local.revision + 1, ideas };
  return parseCollection(JSON.stringify(next));
}
export function markdown(collection: Collection) {
  return (
    "# Aurea developer ideas\n\n" +
    collection.ideas
      .map(
        (idea) =>
          `## ${idea.title}\n\n${idea.id} · ${idea.category} · ${idea.priority} · ${idea.status}\n\n${idea.description}\n\n${idea.reproduction ? "Reproduction:\n" + idea.reproduction + "\n\n" : ""}${idea.implementation ? "Implementation: " + JSON.stringify(idea.implementation) + "\n\n" : ""}Created ${idea.createdAt}; modified ${idea.modifiedAt}\n`,
      )
      .join("\n")
  );
}
