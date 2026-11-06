// SPDX-License-Identifier: AGPL-3.0-only
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, AppState } from "react-native";
import { FocusButton } from "../../components/FocusButton";
import { PeerTransport } from "../peer/transport";
import type { RemoteClient } from "../client";
import { PreviewSession } from "./PreviewSession";
import { previewAudio } from "./audio";
/** A separate scoped, encrypted connection; regular TV controls retain their own transport. */
export function PreviewPanel({ client }: { client: RemoteClient }) {
  const [chooseApp,setChooseApp]=useState(false);
  const [state, setState] = useState({
    phase: "idle",
    image: undefined as string | undefined,
    sound: false,
    audioError: false,
  });
  const session = useRef<PreviewSession | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    const current = new PreviewSession(
      () => client.previewTicket(),
      (id) => new PeerTransport(id),
      previewAudio(),
      (value) => {
        if (mounted) setState({ ...value, image: value.image });
      },
    );
    session.current = current;
    const subscription = AppState.addEventListener("change", (value) => {
      if (value === "background") void current.stop();
    });
    return () => {
      mounted = false;
      subscription.remove();
      void current.stop();
    };
  }, [client]);
  const { phase, image, sound, audioError } = state,
    active =
      phase === "sharing" || phase === "awaiting_tv" || phase === "connecting";
  return (
    <View style={{ gap: 14 }}>
      <Text style={{ color: "#c3cede", lineHeight: 21 }}>
        Private app preview · Approve sharing on the TV. HDMI and protected
        content cannot be captured. Apps may block sound. Capture stops after
        two minutes.
      </Text>
      {image ? (
        <Image
          testID="private-preview-frame"
          source={{ uri: image }}
          resizeMode="contain"
          style={{
            width: "100%",
            aspectRatio: 16 / 9,
            backgroundColor: "#000",
            borderRadius: 16,
          }}
        />
      ) : (
        <View
          style={{
            aspectRatio: 16 / 9,
            backgroundColor: "#000",
            borderRadius: 16,
            justifyContent: "center",
            padding: 18,
          }}
        >
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: "#fff", textAlign: "center" }}
          >
            {phase === "awaiting_tv"
              ? "Approve app sharing on the television…"
              : phase === "connecting"
                ? "Opening encrypted preview…"
                : phase === "sharing"
                  ? "Waiting for a captured frame. Protected content may be blank."
                  : phase === "denied"
                    ? "Sharing was declined on the TV."
                    : phase === "approval_expired"
                      ? "TV approval expired."
                      : phase === "capture_unavailable"
                        ? "Screen capture is unavailable on this television."
                        : phase === "connection_failed"
                          ? "Preview connection failed. Check Wi-Fi and try again."
                          : "App preview is off."}
          </Text>
        </View>
      )}
      {phase === "sharing" && (
        <Text style={{ color: "#aab9cb" }}>
          {sound && !audioError
            ? "Eligible app audio is enabled."
            : "Video only · app audio is unavailable."}
        </Text>
      )}
      <FocusButton
        id="phone-preview-start"
        group="phone-modal"
        label={active ? "Stop preview" : "Start app preview"}
        onPress={() => {
          if (active) void session.current?.stop();
          else void session.current?.start();
        }}
        style={{ padding: 14, borderRadius: 18, backgroundColor: "#ffffff12" }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>
          {active ? "Stop preview" : "Start app preview"}
        </Text>
      </FocusButton>
      {phase==="sharing"&&<><View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{([['left','←'],['up','↑'],['ok','OK'],['down','↓'],['right','→'],['back','Back'],['home','Home']] as const).map(([key,label])=><FocusButton key={key} id={'preview-key-'+key} group="phone-modal" label={key} onPress={()=>{void client.key(key);}} style={{minWidth:44,padding:8,backgroundColor:'#ffffff12',borderRadius:14}}><Text style={{color:'#fff'}}>{label}</Text></FocusButton>)}</View><FocusButton id="preview-choose-app" group="phone-modal" label="Open an app" onPress={()=>setChooseApp(value=>!value)} style={{padding:12,backgroundColor:'#ffffff12',borderRadius:14}}><Text style={{color:'#fff'}}>Open an app</Text></FocusButton>{chooseApp&&client.snapshot.catalog?.apps.map(app=><FocusButton key={app.id} id={'preview-open-'+app.id} group="phone-modal" label={app.name} onPress={()=>{setChooseApp(false);void client.launch(app.id);}} style={{padding:10,alignItems:'flex-start'}}><Text style={{color:'#fff'}} numberOfLines={1}>{app.name}</Text></FocusButton>)}</>}
      <Text style={{ color: "#aab9cb", fontSize: 12 }}>
        You may open apps on the TV while this panel is visible. Closing this
        panel stops sharing. Images and sound are kept in memory and are never
        sent to the signaling server.
      </Text>
    </View>
  );
}
