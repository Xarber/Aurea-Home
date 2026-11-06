// SPDX-License-Identifier: AGPL-3.0-only
import { test } from "node:test";
import assert from "node:assert/strict";
import { PreviewSession } from "../../src/remote/preview/PreviewSession.ts";
import type { Transport } from "../../src/remote/types";
const ticket = {
  url: "https://aurea.xcenter.it/#tv=11111111-1111-1111-1111-111111111111",
  token: "a".repeat(32),
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function sound() {
  return {
    sent: [] as string[],
    stops: 0,
    async start() {},
    async push(value: string) {
      this.sent.push(value);
    },
    async stop() {
      this.stops++;
    },
  };
}
test("preview rejects arbitrary endpoints before opening a media connection", async () => {
  const audio = sound();
  let connections = 0;
  const session = new PreviewSession(
    async () => ({ ...ticket, url: "http://untrusted.invalid" }),
    () => {
      connections++;
      throw Error("unexpected");
    },
    audio,
    () => {},
  );
  await session.start();
  assert.equal(connections, 0);
  assert.equal(session.state.phase, "connection_failed");
  assert.equal(audio.stops, 1);
});
test("canceling pending ticket creation never starts capture or leaks the scoped token", async () => {
  let resolve!: (value: Record<string, unknown>) => void;
  const audio = sound();
  let connections = 0;
  const session = new PreviewSession(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
    () => {
      connections++;
      throw Error("unexpected");
    },
    audio,
    () => {},
  );
  const starting = session.start();
  await tick();
  await session.stop();
  resolve(ticket);
  await starting;
  assert.equal(connections, 0);
  assert.equal(session.state.phase, "stopped");
});
test("TV denial closes the peer and audio without replaying capture requests", async () => {
  const calls: string[] = [],
    audio = sound();
  let closed = false;
  const transport: Transport = {
    rpc: async (operation) => {
      calls.push(operation);
      return operation === "preview_frame" ? { status: "denied" } : {};
    },
    close: () => {
      closed = true;
    },
  };
  const session = new PreviewSession(
    async () => ticket,
    () => transport,
    audio,
    () => {},
  );
  await session.start();
  await tick();
  assert.deepEqual(calls, ["preview_start", "preview_frame", "preview_end"]);
  assert.equal(closed, true);
  assert.equal(session.state.phase, "denied");
});
test("preview sequences deduplicate audio and stopping discards captured pixels", async () => {
  const audio = sound(),
    calls: string[] = [],
    tokens: string[] = [];
  const transport: Transport = {
    rpc: async (operation, _payload, token) => {
      calls.push(operation);
      tokens.push(token!);
      return operation === "preview_frame"
        ? {
            status: "sharing",
            image: "data:image/jpeg;base64,/9j/2Q==",
            imageSequence: 1,
            audioAvailable: true,
            audio: [{ sequence: 1, pcm: "AAAA" }],
          }
        : {};
    },
    close: () => {},
  };
  const session = new PreviewSession(
    async () => ticket,
    () => transport,
    audio,
    () => {},
  );
  await session.start();
  await tick();
  assert.ok(session.state.image);
  assert.deepEqual(audio.sent, ["AAAA"]);
  await new Promise((resolve) => setTimeout(resolve, 280));
  assert.deepEqual(audio.sent, ["AAAA"]);
  await session.stop();
  assert.equal(session.state.image, undefined);
  assert.ok(tokens.every((token) => token === ticket.token));
  assert.equal(calls.filter((call) => call === "preview_start").length, 1);
});
