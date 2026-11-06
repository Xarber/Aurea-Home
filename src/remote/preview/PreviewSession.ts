// SPDX-License-Identifier: AGPL-3.0-only
import type { Transport } from "../types";
export interface PreviewState {
  phase: string;
  image?: string;
  sound: boolean;
  audioError: boolean;
}
export interface PreviewAudio {
  start(): Promise<void>;
  push(value: string): Promise<void>;
  stop(): Promise<void>;
}
/** Media only crosses a scoped WebRTC transport; the primary remote issues a ticket only. */
export class PreviewSession {
  private stopping?:Promise<void>;
  private active = false;
  private generation = 0;
  private peer?: Transport;
  private token = "";
  private request?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private audioReady = false;
  state: PreviewState = { phase: "idle", sound: false, audioError: false };
  private ticket: () => Promise<Record<string, unknown>>;
  private transport: (id: string) => Transport;
  private audio: PreviewAudio;
  private changed: (state: PreviewState) => void;
  constructor(
    ticket: () => Promise<Record<string, unknown>>,
    transport: (id: string) => Transport,
    audio: PreviewAudio,
    changed: (state: PreviewState) => void,
  ) {
    this.ticket = ticket;
    this.transport = transport;
    this.audio = audio;
    this.changed = changed;
  }
  private publish(update: Partial<PreviewState>) {
    this.state = { ...this.state, ...update };
    this.changed(this.state);
  }
  private async rpc(operation: string, payload: Record<string, unknown>) {
    const request = new AbortController();
    this.request = request;
    const timeout = setTimeout(() => request.abort(), 8000);
    try {
      const result = await this.peer!.rpc(
        operation,
        payload,
        this.token,
        request.signal,
      );
      if (result.error) throw Error("preview_failed");
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }
  async start() {
    await this.stopping;
    if (this.active) return;
    this.active = true;
    const generation = ++this.generation;
    this.publish({
      phase: "connecting",
      image: undefined,
      audioError: false,
      sound: false,
    });
    try {
      await this.audio.start();
      this.audioReady = true;
    } catch {
      this.audioReady = false;
      this.publish({ audioError: true });
    }
    if (generation !== this.generation) return;
    try {
      const ticket = await this.ticket();
      if (generation !== this.generation) return;
      const match =
        typeof ticket.url === "string"
          ? /^https:\/\/aurea\.xcenter\.it\/#tv=([a-f0-9-]{36})$/.exec(
              ticket.url,
            )
          : null;
      if (
        !match ||
        typeof ticket.token !== "string" ||
        !/^[a-f0-9]{32}$/.test(ticket.token)
      )
        throw Error("invalid_ticket");
      this.token = ticket.token;
      this.peer = this.transport(match[1]!);
      await this.rpc("preview_start", {});
      if (generation !== this.generation) return;
      void this.poll(generation, -1, -1);
    } catch {
      if (generation !== this.generation) return;
      await this.stop();
      if(this.generation===generation+1)this.publish({ phase: "connection_failed" });
    }
  }
  private async poll(
    generation: number,
    imageAfter: number,
    audioAfter: number,
  ) {
    if (!this.active || generation !== this.generation) return;
    try {
      const frame = await this.rpc("preview_frame", { imageAfter, audioAfter });
      if (generation !== this.generation) return;
      const phase = String(frame.status);
      if (!["awaiting_tv", "sharing"].includes(phase)) {
        await this.stop();
        if(this.generation===generation+1)this.publish({ phase });
        return;
      }
      this.publish({ phase, sound: frame.audioAvailable === true });
      if (
        typeof frame.image === "string" &&
        frame.image.length < 120000 &&
        /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(frame.image) &&
        Number.isSafeInteger(frame.imageSequence)
      ) {
        this.publish({ image: frame.image });
        imageAfter = Number(frame.imageSequence);
      }
      if (Array.isArray(frame.audio) && frame.audio.length <= 6)
        for (const part of frame.audio) {
          if (generation !== this.generation) break;
          if (
            !Number.isSafeInteger(part.sequence) ||
            part.sequence <= audioAfter ||
            typeof part.pcm !== "string" ||
            part.pcm.length > 6000 ||
            !/^[A-Za-z0-9+/]+=*$/.test(part.pcm)
          )
            continue;
          audioAfter = part.sequence;
          if (this.audioReady)
            try {
              await this.audio.push(part.pcm);
            } catch {
              this.audioReady = false;
              this.publish({ audioError: true });
              await this.audio.stop().catch(() => {});
            }
        }
      if (this.active && generation === this.generation)
        this.timer = setTimeout(() => {
          void this.poll(generation, imageAfter, audioAfter);
        }, 250);
    } catch {
      if (generation !== this.generation) return;
      await this.stop();
      if(this.generation===generation+1)this.publish({ phase: "connection_failed" });
    }
  }
  stop():Promise<void> {
    if(this.stopping)return this.stopping;
    this.active=false;this.generation++;clearTimeout(this.timer);this.request?.abort();
    const peer=this.peer,token=this.token;this.peer=undefined;this.token="";this.audioReady=false;
    this.publish({phase:"stopped",image:undefined,sound:false});
    this.stopping=Promise.resolve().then(async()=>{
      await this.audio.stop().catch(()=>{});
      try{if(peer&&token){const request=new AbortController(),timeout=setTimeout(()=>request.abort(),1500);try{await peer.rpc("preview_end",{},token,request.signal);}finally{clearTimeout(timeout);}}}catch{}finally{peer?.close?.();}
    }).finally(()=>{this.stopping=undefined;});return this.stopping;
  }
}
