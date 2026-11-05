// SPDX-License-Identifier: AGPL-3.0-only
export async function exportFile(text: string, markdown = false) {
  const url = URL.createObjectURL(
    new Blob([text], { type: markdown ? "text/markdown" : "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "aurea-ideas." + (markdown ? "md" : "json");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function importFile(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.oncancel = () => resolve(undefined);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      if (file.size > 4_000_000) {
        resolve("File exceeds the supported size");
        return;
      }
      void file.text().then(resolve);
    };
    input.click();
  });
}
export async function copyText(text: string) {
  if (!navigator.clipboard)
    throw Error("Clipboard requires HTTPS or the native app");
  await navigator.clipboard.writeText(text);
}
