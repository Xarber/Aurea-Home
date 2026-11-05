// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState } from "react";
import { View, Text } from "react-native";
import history from "../../assets/release-history.json";
import { FocusButton } from "./FocusButton";
import { Icon } from "./Icon";
/** Generated from the canonical release source, bundled for offline phone/web use. */
export function SharedChangelog({ group = "phone-modal" }: { group?: string }) {
  const [expanded, setExpanded] = useState<string>();
  return (
    <View style={{ gap: 16 }}>
      {history.releases.map((release) => (
        <View key={release.version} style={{ gap: 10 }}>
          <FocusButton
            id={"release-" + release.version}
            group={group}
            label={release.version + " · " + release.highlights.en}
            onPress={() =>
              setExpanded(
                expanded === release.version ? undefined : release.version,
              )
            }
            style={{ alignItems: "flex-start", padding: 12 }}
          >
            <Text style={{ color: "#fff", fontSize: 19, fontWeight: "700" }}>
              {release.version} · {release.date}
            </Text>
            <Text style={{ color: "#c4cede", fontSize: 14 }}>
              {release.highlights.en}
            </Text>
          </FocusButton>
          {expanded === release.version && (
            <>
              <View style={{ gap: 10 }}>
                {release.features.map((feature, index) => (
                  <View key={index} style={{ flexDirection: "row", gap: 10 }}>
                    <Icon
                      name={
                        feature.icon === "code"
                          ? "code"
                          : feature.icon === "remote"
                            ? "remote"
                            : "info"
                      }
                      size={20}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        {feature.label.en}
                      </Text>
                      <Text style={{ color: "#bcc7d8" }}>
                        {feature.detail.en}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                Fixes &amp; Improvements
              </Text>
              <Text style={{ color: "#bcc7d8" }}>{release.fixes.en}</Text>
              <Text style={{ color: "#aab7cc" }}>
                {release.compatibility.en}
              </Text>
            </>
          )}
        </View>
      ))}
    </View>
  );
}
