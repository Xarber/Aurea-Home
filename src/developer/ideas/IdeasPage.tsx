// SPDX-License-Identifier: AGPL-3.0-only
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Share, StyleSheet } from "react-native";
import { FocusButton } from "../../components/FocusButton";
import { Icon } from "../../components/Icon";
import type { IconName } from "../../model/catalog";
import {
  categories,
  statuses,
  empty,
  newIdea,
  changeIdea,
  parseCollection,
  mergeIdeas,
  markdown,
  type Collection,
  type Idea,
  type Status,
} from "./model";
import { loadIdeas, updateIdeas } from "./storage";
import { exportFile, importFile, copyText } from "./files";
const icons: Record<Idea["category"], IconName> = {
  Feature: "apps",
  Improvement: "sun",
  "Bug Fix": "code",
  "UI/UX": "settings",
  Performance: "sun",
  Other: "info",
};
/** Local developer data. Never sent to the TV, signaling server or public repository. */
export function IdeasPage({
  group = "modal",
  onChangelog,
}: {
  group?: string;
  onChangelog?: (version: string) => void;
}) {
  const [data, setData] = useState(empty),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [category, setCategory] = useState("All"),
    [sort, setSort] = useState<"Updated" | "Title" | "Priority">("Updated"),
    [edit, setEdit] = useState<Idea>(),
    [selected, setSelected] = useState<string[]>([]),
    [incoming, setIncoming] = useState<Collection>(),
    [replace, setReplace] = useState<string[]>([]),
    [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState(false),
    [expanded, setExpanded] = useState<string>(),
    [limit, setLimit] = useState(50);
  useEffect(() => setLimit(50), [query, filter, category, sort]);
  useEffect(() => {
    let active = true;
    void loadIdeas()
      .then((value) => {
        if (active) {
          setData(value);
          setLoaded(true);
        }
      })
      .catch((reason) => {
        if (active) setError(String(reason));
      });
    return () => {
      active = false;
    };
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Ideas operation failed",
      );
    } finally {
      setBusy(false);
    }
  };
  const persist = async (action: (current: Collection) => Collection) => {
    setData(await updateIdeas(action));
  };
  const button = (
    id: string,
    label: string,
    action: () => void,
    icon: IconName = "info",
    active = false,
  ) => (
    <FocusButton
      key={id}
      id={"ideas-" + id}
      group={group}
      label={label}
      disabled={busy}
      onPress={action}
      style={[s.button, active && s.active]}
    >
      <Icon name={icon} size={18} />
      <Text style={s.text}>{label}</Text>
    </FocusButton>
  );
  const input = (
    id: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    multiline = false,
  ) => (
    <TextInput
      testID={"ideas-" + id}
      accessibilityLabel={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#a8b4c8"
      maxLength={id === "title" ? 200 : id === "reproduction" ? 8000 : 16000}
      multiline={multiline}
      style={[
        s.input,
        multiline && { minHeight: 100, textAlignVertical: "top" },
      ]}
    />
  );
  const exportData = (value: Collection, md = false) => {
    void run(() =>
      exportFile(
        md
          ? markdown(value)
          : JSON.stringify(
              { ...value, exportedAt: new Date().toISOString() },
              null,
              2,
            ),
        md,
      ),
    );
  };
  const selectedIdeas = data.ideas.filter((idea) => selected.includes(idea.id));
  const updateStatus = (status: Status) => {
    void run(async () => {
      await persist((current) => ({
        ...current,
        ideas: current.ideas.map((idea) =>
          selected.includes(idea.id) ? changeIdea(idea, { status }) : idea,
        ),
      }));
      setSelected([]);
    });
  };
  const visible = data.ideas
    .filter(
      (idea) =>
        (filter === "All" || idea.status === filter) &&
        (category === "All" || idea.category === category) &&
        [idea.title, idea.description, idea.reproduction]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Title"
        ? a.title.localeCompare(b.title)
        : sort === "Priority"
          ? ["High", "Medium", "Low", "None"].indexOf(a.priority) -
            ["High", "Medium", "Low", "None"].indexOf(b.priority)
          : b.modifiedAt.localeCompare(a.modifiedAt),
    );
  return (
    <View style={s.root}>
      <Text style={s.title}>Ideas</Text>
      <Text style={s.muted}>Private to this installation · Works offline</Text>
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          {notice}
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {busy && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          Saving…
        </Text>
      )}
      {!loaded ? (
        button("reload", "Retry loading", () => {
          void run(async () => {
            setData(await loadIdeas());
            setLoaded(true);
          });
        })
      ) : (
        <>
          {edit ? (
            <>
              {input(
                "title",
                edit.title,
                (title) => setEdit({ ...edit, title }),
                "Idea title",
              )}
              {input(
                "description",
                edit.description,
                (description) => setEdit({ ...edit, description }),
                "Description",
                true,
              )}
              {input(
                "reproduction",
                edit.reproduction,
                (reproduction) => setEdit({ ...edit, reproduction }),
                "Reproduction steps (optional)",
                true,
              )}
              <Text style={s.muted}>Category</Text>
              <View style={s.wrap}>
                {categories.map((value) =>
                  button(
                    "category-" + value,
                    value,
                    () => setEdit({ ...edit, category: value }),
                    icons[value],
                    edit.category === value,
                  ),
                )}
              </View>
              <Text style={s.muted}>Priority</Text>
              <View style={s.wrap}>
                {(["None", "Low", "Medium", "High"] as const).map((value) =>
                  button(
                    "priority-" + value,
                    value,
                    () => setEdit({ ...edit, priority: value }),
                    "info",
                    edit.priority === value,
                  ),
                )}
              </View>
              <Text style={s.muted}>Status</Text>
              <View style={s.wrap}>
                {statuses.map((value) =>
                  button(
                    "status-" + value,
                    value,
                    () => setEdit({ ...edit, status: value }),
                    "code",
                    edit.status === value,
                  ),
                )}
              </View>
              {edit.status === "Implemented" && (
                <>
                  <Text style={s.muted}>
                    Verification and release references are required.
                  </Text>
                  {(
                    [
                      "commit",
                      "version",
                      "verifiedAt",
                      "pullRequest",
                      "changelog",
                    ] as const
                  ).map((key) =>
                    input(
                      "ref-" + key,
                      edit.implementation?.[key] ?? "",
                      (value) =>
                        setEdit({
                          ...edit,
                          implementation: {
                            ...edit.implementation,
                            [key]: value,
                          },
                        }),
                      key === "verifiedAt" ? "Verification date (ISO)" : key,
                    ),
                  )}
                </>
              )}
              <View style={s.wrap}>
                {button(
                  "save",
                  "Save idea",
                  () => {
                    void run(async () => {
                      if (!edit.title.trim()) throw Error("Enter a title");
                      await persist((current) => {
                        const prior = current.ideas.find(
                            (idea) => idea.id === edit.id,
                          ),
                          view = data.ideas.find((idea) => idea.id === edit.id);
                        if (view && !prior)
                          throw Error(
                            "This idea was deleted elsewhere. Reload before editing.",
                          );
                        if (
                          prior &&
                          view &&
                          prior.modifiedAt !== view.modifiedAt
                        )
                          throw Error(
                            "This idea changed elsewhere. Close and reload before editing.",
                          );
                        const idea = prior
                          ? changeIdea(prior, edit)
                          : { ...edit, title: edit.title.trim() };
                        return parseCollection(
                          JSON.stringify({
                            ...current,
                            ideas: [
                              ...current.ideas.filter(
                                (saved) => saved.id !== edit.id,
                              ),
                              idea,
                            ],
                          }),
                        );
                      });
                      setEdit(undefined);
                    });
                  },
                  "check",
                )}
                {button("cancel", "Cancel", () => setEdit(undefined), "close")}
              </View>
            </>
          ) : incoming ? (
            <>
              <Text style={s.title}>Review import</Text>
              <Text style={s.muted}>
                New ideas are added. Existing ideas stay unchanged unless you
                select their incoming version.
              </Text>
              {incoming.ideas.map((idea) => {
                const prior = data.ideas.find((saved) => saved.id === idea.id);
                return (
                  <View key={idea.id} style={s.card}>
                    <Text style={s.text}>{idea.title}</Text>
                    <Text style={s.muted}>
                      {idea.status} ·{" "}
                      {prior ? "Existing identifier" : "New idea"}
                    </Text>
                    <Text style={s.text}>{idea.description}</Text>
                    {prior && (
                      <Text style={s.muted}>
                        Saved: {prior.title} · {prior.status}
                        {"\n"}
                        {prior.description}
                      </Text>
                    )}
                    {prior &&
                      JSON.stringify(prior) !== JSON.stringify(idea) &&
                      button(
                        "replace-" + idea.id,
                        replace.includes(idea.id)
                          ? "Use incoming version"
                          : "Keep saved version",
                        () =>
                          setReplace((list) =>
                            list.includes(idea.id)
                              ? list.filter((id) => id !== idea.id)
                              : [...list, idea.id],
                          ),
                        "check",
                        replace.includes(idea.id),
                      )}
                  </View>
                );
              })}
              <View style={s.wrap}>
                {button(
                  "import-confirm",
                  "Apply reviewed import",
                  () => {
                    void run(async () => {
                      await persist((current) => {
                        for (const id of replace)
                          if (
                            JSON.stringify(
                              current.ideas.find((idea) => idea.id === id),
                            ) !==
                            JSON.stringify(
                              data.ideas.find((idea) => idea.id === id),
                            )
                          )
                            throw Error(
                              "A saved idea changed during review. Cancel and reopen import.",
                            );
                        return mergeIdeas(current, incoming, new Set(replace));
                      });
                      setIncoming(undefined);
                      setReplace([]);
                    });
                  },
                  "check",
                )}
                {button(
                  "import-cancel",
                  "Cancel",
                  () => setIncoming(undefined),
                  "close",
                )}
              </View>
            </>
          ) : (
            <>
              <View style={s.wrap}>
                {button("new", "New idea", () => setEdit(newIdea()), "apps")}
                {button(
                  "export",
                  "Export JSON",
                  () => exportData(data),
                  "remote",
                )}
                {button(
                  "markdown",
                  "Export Markdown",
                  () => exportData(data, true),
                  "code",
                )}
                {button(
                  "copy-json",
                  "Copy JSON",
                  () => {
                    void run(async () => {
                      await copyText(JSON.stringify(data, null, 2));
                      setNotice("Copied Ideas JSON");
                    });
                  },
                  "code",
                )}
                {button(
                  "import",
                  "Import JSON",
                  () => {
                    void run(async () => {
                      const text = await importFile();
                      if (text) {
                        setIncoming(parseCollection(text));
                        setReplace([]);
                      }
                    });
                  },
                  "apps",
                )}
              </View>
              {input("search", query, setQuery, "Search ideas")}
              <View style={s.wrap}>
                {["All", ...statuses].map((value) =>
                  button(
                    "filter-" + value,
                    value,
                    () => setFilter(value),
                    "code",
                    filter === value,
                  ),
                )}
              </View>
              <View style={s.wrap}>
                {button(
                  "category-filter",
                  "Category: " + category,
                  () => {
                    const values = ["All", ...categories];
                    setCategory(
                      values[(values.indexOf(category) + 1) % values.length]!,
                    );
                  },
                  "apps",
                )}
                {button(
                  "sort",
                  "Sort: " + sort,
                  () =>
                    setSort(
                      sort === "Updated"
                        ? "Title"
                        : sort === "Title"
                          ? "Priority"
                          : "Updated",
                    ),
                  "info",
                )}
              </View>
              <Text style={s.muted}>
                {data.ideas.filter((idea) => idea.status === "Pending").length}{" "}
                pending ·{" "}
                {data.ideas.filter((idea) => idea.status === "Approved").length}{" "}
                approved ·{" "}
                {data.ideas.filter((idea) => idea.status === "Deferred").length}{" "}
                deferred
              </Text>
              {selected.length > 0 && (
                <View style={s.card}>
                  <Text style={s.text}>{selected.length} selected</Text>
                  <View style={s.wrap}>
                    {statuses
                      .filter((value) => value !== "Implemented")
                      .map((value) =>
                        button(
                          "batch-" + value,
                          value,
                          () => updateStatus(value),
                          "code",
                        ),
                      )}
                    {button(
                      "batch-export",
                      "Export selected",
                      () => exportData({ ...data, ideas: selectedIdeas }),
                      "remote",
                    )}
                    {button(
                      "batch-delete",
                      "Delete selected",
                      () => setConfirm(true),
                      "close",
                    )}
                    {button(
                      "clear-selection",
                      "Clear selection",
                      () => setSelected([]),
                      "close",
                    )}
                  </View>
                </View>
              )}
              {confirm && (
                <View style={s.card}>
                  <Text style={s.text}>
                    Delete {selected.length} selected ideas from this
                    installation? Export a backup first if needed.
                  </Text>
                  <View style={s.wrap}>
                    {button(
                      "confirm-delete",
                      "Confirm deletion",
                      () => {
                        void run(async () => {
                          await persist((current) => ({
                            ...current,
                            ideas: current.ideas.filter(
                              (idea) => !selected.includes(idea.id),
                            ),
                          }));
                          setSelected([]);
                          setConfirm(false);
                        });
                      },
                      "close",
                    )}
                    {button(
                      "cancel-delete",
                      "Cancel",
                      () => setConfirm(false),
                      "check",
                    )}
                  </View>
                </View>
              )}
              {visible.length === 0 && (
                <Text style={s.muted}>No matching ideas.</Text>
              )}
              {visible.slice(0, limit).map((idea) => (
                <View key={idea.id} style={s.card}>
                  <View style={s.wrap}>
                    {button(
                      "select-" + idea.id,
                      selected.includes(idea.id) ? "Selected" : "Select",
                      () =>
                        setSelected((list) =>
                          list.includes(idea.id)
                            ? list.filter((id) => id !== idea.id)
                            : [...list, idea.id],
                        ),
                      "check",
                      selected.includes(idea.id),
                    )}
                    {button(
                      "details-" + idea.id,
                      idea.title,
                      () =>
                        setExpanded(expanded === idea.id ? undefined : idea.id),
                      icons[idea.category],
                    )}
                  </View>
                  <Text style={s.muted}>
                    {idea.status} · {idea.category} · {idea.priority}
                  </Text>
                  <Text
                    style={s.text}
                    numberOfLines={expanded === idea.id ? undefined : 2}
                  >
                    {idea.description}
                  </Text>
                  {expanded === idea.id && (
                    <>
                      <Text selectable style={s.muted}>
                        {idea.id}
                        {"\n"}Created {idea.createdAt}
                        {"\n"}Updated {idea.modifiedAt}
                        {"\n"}
                        {idea.reproduction}
                      </Text>
                      {idea.implementation && (
                        <Text selectable style={s.muted}>
                          Implementation: {JSON.stringify(idea.implementation)}
                        </Text>
                      )}
                      {idea.implementation?.version &&
                        onChangelog &&
                        button(
                          "changelog-" + idea.id,
                          "View changelog",
                          () => onChangelog(idea.implementation!.version!),
                          "info",
                        )}
                      {idea.history.length > 50 && (
                        <Text style={s.muted}>
                          Latest 50 events · Export includes the complete
                          history.
                        </Text>
                      )}
                      {idea.history.slice(-50).map((event, index) => (
                        <Text key={index} style={s.muted}>
                          {event.at} · {event.status} · {event.note}
                        </Text>
                      ))}
                    </>
                  )}
                  <View style={s.wrap}>
                    {button(
                      "edit-" + idea.id,
                      "Edit",
                      () => setEdit({ ...idea }),
                      "settings",
                    )}
                    {button(
                      "duplicate-" + idea.id,
                      "Duplicate",
                      () =>
                        setEdit({
                          ...newIdea(),
                          title: idea.title + " (copy)",
                          description: idea.description,
                          reproduction: idea.reproduction,
                          category: idea.category,
                          priority: idea.priority,
                        }),
                      "apps",
                    )}
                    {button(
                      "copy-" + idea.id,
                      "Copy",
                      () => {
                        void run(async () => {
                          await copyText(
                            markdown({ ...empty(), ideas: [idea] }),
                          );
                          setNotice("Copied idea");
                        });
                      },
                      "code",
                    )}
                    {button(
                      "share-" + idea.id,
                      "Share",
                      () => {
                        void run(async () => {
                          await Share.share({
                            message: markdown({ ...empty(), ideas: [idea] }),
                          });
                        });
                      },
                      "remote",
                    )}
                  </View>
                </View>
              ))}
              {visible.length > limit &&
                button(
                  "more",
                  "Show more ideas",
                  () => setLimit((value) => value + 50),
                  "apps",
                )}
            </>
          )}
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  root: { gap: 12, paddingVertical: 8 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  text: { color: "#f0f3fa", fontSize: 15, flexShrink: 1 },
  muted: { color: "#b8c4d8", fontSize: 12, lineHeight: 19 },
  error: { color: "#ffb1b8" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#ffffff0b",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
  },
  active: { backgroundColor: "#ffffff24" },
  input: {
    color: "#fff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffffff2b",
    fontSize: 15,
    minHeight: 48,
  },
  card: { padding: 12, gap: 9, borderRadius: 16, backgroundColor: "#ffffff09" },
});
