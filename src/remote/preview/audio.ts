// SPDX-License-Identifier: AGPL-3.0-only
export function previewAudio() {
  let context: AudioContext | undefined,
    next = 0;
  const nodes = new Set<AudioBufferSourceNode>();
  return {
    async start() {
      context = new AudioContext({ sampleRate: 16000 });
      await context.resume();
    },
    async push(encoded: string) {
      if (!context) return;
      const raw = atob(encoded),
        samples = raw.length / 2,
        buffer = context.createBuffer(1, samples, 16000),
        out = buffer.getChannelData(0);
      for (let i = 0; i < samples; i++) {
        const n = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8);
        out[i] = (n > 32767 ? n - 65536 : n) / 32768;
      }
      if (next - context.currentTime > 0.8) return;
      const node = context.createBufferSource();
      node.buffer = buffer;
      node.connect(context.destination);
      nodes.add(node);
      node.onended = () => nodes.delete(node);
      const at = Math.max(context.currentTime, next);
      node.start(at);
      next = at + buffer.duration;
    },
    async stop() {
      for (const node of nodes)
        try {
          node.stop();
        } catch {}
      nodes.clear();
      await context?.close();
      context = undefined;
    },
  };
}
