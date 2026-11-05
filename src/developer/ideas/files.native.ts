// SPDX-License-Identifier: AGPL-3.0-only
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Picker from "expo-document-picker";
import { Share } from "react-native";
export async function exportFile(text: string, markdown = false) {
  if (await Sharing.isAvailableAsync()) {
    const file = new File(
      Paths.cache,
      "aurea-ideas." + (markdown ? "md" : "json"),
    );
    file.write(text);
    await Sharing.shareAsync(file.uri, {
      mimeType: markdown ? "text/markdown" : "application/json",
      dialogTitle: "Export Aurea ideas",
    });
  } else await Share.share({ message: text, title: "Aurea ideas" });
}
export async function importFile(): Promise<string | undefined> {
  const result = await Picker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });
  if (result.canceled) return;
  const file = result.assets[0];
  if (!file) return;
  if ((file.size ?? 0) > 4_000_000) throw Error("Ideas file is too large");
  return new File(file.uri).text();
}
export async function copyText(text: string) {
  const Clipboard = await import("expo-clipboard");
  await Clipboard.setStringAsync(text);
}
