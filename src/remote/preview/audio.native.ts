// SPDX-License-Identifier: AGPL-3.0-only
import { requireOptionalNativeModule } from "expo";
export function previewAudio() {
  const module = requireOptionalNativeModule<{
    playPreviewPCM(value: string): Promise<void>;
    stopPreviewAudio(): Promise<void>;
  }>("AureaMicrophone");
  return {
    async start() {
      if (!module?.playPreviewPCM) throw Error("native_audio_unavailable");
    },
    async push(value: string) {
      await module?.playPreviewPCM(value);
    },
    async stop() {
      await module?.stopPreviewAudio?.();
    },
  };
}
