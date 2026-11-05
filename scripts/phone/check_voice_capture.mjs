#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Host-only synthetic audio probe. Does not request or record microphone input.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import assert from "node:assert/strict";
if (process.platform !== "darwin") {
  console.log("SKIP: Swift/Apple-framework host required");
  process.exit(0);
}
const root = mkdtempSync(join(tmpdir(), "aurea-voice-probe-"));
try {
  let source = readFileSync(
    new URL(
      "../../modules/aurea-microphone/ios/AureaMicrophoneModule.swift",
      import.meta.url,
    ),
    "utf8",
  );
  source =
    "import AVFoundation\nimport CryptoKit\nimport Security\nimport Foundation\n" +
    source
      .slice(source.indexOf("private enum CaptureError:"))
      .replaceAll("private ", "");
  // AVAudioSession is iOS-only. The probe exercises conversion/crypto/Data cleanup, not session/hardware setup.
  const start = source.indexOf(
      "    let session = AVAudioSession.sharedInstance()",
    ),
    end = source.indexOf("    let input = engine.inputNode", start);
  source = source.slice(0, start) + source.slice(end);
  source = source.replace(
    "    if started { try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation); started = false }",
    "    started = false",
  );
  source += `\nlet input=try JSONSerialization.jsonObject(with:FileHandle.standardInput.readDataToEndOfFile()) as! [String:String]
let done=DispatchSemaphore(value:0)
let capture=try MicrophoneCapture(id:input["id"]!,publicKey:input["publicKey"]!){event,body in
 if event == "chunk" {let json=try! JSONSerialization.data(withJSONObject:body);print(String(data:json,encoding:.utf8)!)}
 if event == "stopped" {done.signal()}
}
capture.append(Data(repeating:17,count:8192))
capture.append(Data(repeating:19,count:1024))
capture.stop();capture.stop()
precondition(done.wait(timeout:.now()+5) == .success)
`;
  const script = join(root, "Probe.swift");
  writeFileSync(script, source);
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    }),
    id = "a".repeat(32);
  const output = execFileSync("swift", [script], {
    input: JSON.stringify({
      id,
      publicKey: publicKey
        .export({ type: "pkcs1", format: "der" })
        .toString("base64"),
    }),
    encoding: "utf8",
    timeout: 45000,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const packets = output.trim().split("\n").map(JSON.parse);
  assert.equal(packets.length, 2);
  for (let i = 0; i < packets.length; i++) {
    const packet = packets[i];
    assert.equal(packet.sequence, i);
    const key = crypto.privateDecrypt(
        { key: privateKey, oaepHash: "sha256" },
        Buffer.from(packet.wrappedKey, "base64"),
      ),
      encrypted = Buffer.from(packet.ciphertext, "base64");
    const decrypt = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(packet.nonce, "base64"),
    );
    decrypt.setAAD(Buffer.from(id + ":" + i));
    decrypt.setAuthTag(encrypted.subarray(-16));
    const pcm = Buffer.concat([
      decrypt.update(encrypted.subarray(0, -16)),
      decrypt.final(),
    ]);
    assert.equal(pcm.length, i ? 1024 : 8192);
    assert.ok(pcm.every((value) => value === (i ? 19 : 17)));
  }
  console.log(
    "PASS: actual Swift capture encryption, sequential PCM, residual flush and repeated Stop; synthetic host test, no physical audio/session validation",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
