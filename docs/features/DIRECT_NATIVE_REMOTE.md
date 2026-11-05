# Direct native system controls

Native iOS/Android companions connect from the phone to the TV's Remote Service:
TLS/Polo pairing on 6467 and persistent Remote v2 control on 6466. This avoids the
source-sensitive loopback rejection observed on the user's TV. The launcher
HTTP connection still supplies music, artwork, apps, inputs, Home state and
launcher-local actions. Native system buttons and voice do not relay through it.

`src/remote/system/nativeClient.ts` owns the connection. `wire.ts` encodes only
required Google/Polo protobuf fields, bounds frame sizes and tolerates fragmented
frames. It implements Configure/SetActive/RemoteStart readiness, ping replies,
Android key injection, SEARCH/VoiceBegin/PCM payload/VoiceEnd. The native transport
is react-native-tcp-socket 6.4.3 (MIT); node-forge 1.4.3 (BSD/GPL dual license,
BSD option) handles certificate/proof processing. Expo SDK 58 native development
builds are required, not Expo Go. No OS minimum was raised.

Every TV address gets its own RSA-2048 client certificate, stored in SecureStore.
OS randomness seeds a local PRNG. Initial pairing verifies the six-character
Polo code against both RSA public keys; successful trust pins the server public
key. Later control sessions verify that pin before application protocol traffic.
Remote Service uses self-signed certificates rather than public HTTPS PKI.
Credentials, PINs, certificates, audio and raw exceptions are not diagnostic data.

Phone microphone capture uses the existing native permission and capture module.
Its encrypted PCM packets are unwrapped locally and sent directly over mutual TLS;
no PCM is relayed through the TV launcher or signaling server. Audio uses 8 kHz,
16-bit mono, bounded 8 KiB packets (final short packet padded), 30-second capture,
sequence checks, and explicit stop. Voice capability must be negotiated separately
from button readiness. ADB does not substitute for microphone transport.

Read-only polling recovers connections with backoff; no key is automatically
replayed. Backgrounding and TV switching close the direct socket and voice.
Pairing success appears only after a real acknowledgment. The framework build and
physical iOS/Android pairing, background recovery and voice remain target checks;
web success is not evidence of native interoperability.

Reference: pinned androidtvremote2 0.3.2 and Google's Polo schema, inspected for
field numbers, RSA proof and minimum PCM sizes. No upstream raw-message logging
or historical Anymote implementation is used.

### Foreground restoration and pairing responsiveness
Home always uses the authenticated launcher bridge, including when Home is in the background. It never depends on the phone's system pairing or the optional TV-local ADB bridge. App/input launches retain the server's pending-launch/foreground restoration path. Android background-launch restrictions still apply.

New phone identities use Forge's step-based RSA generation with a five-millisecond work budget, explicit timer yields, cancellation on target changes and a 30-second deadline. This prevents long prime searches from monopolizing the JavaScript event loop. Physical phone pairing must still be validated.

The iOS TLS adapter passes the existing RSA private key as PKCS#1 to react-native-tcp-socket 6.4.3's SecKeyCreateWithData import. Android continues receiving PKCS#8. SecureStore representation, key material, certificate and pairing trust do not change. Apple documents RSA external representations at https://developer.apple.com/documentation/security/storing-keys-as-data. The real-TLS host test asserts the iOS boundary format; physical iPhone validation remains required.

### Pairing progress and microphone cleanup (2.1.1)

The selected TV has a visible system-controls status/action; the pairing panel names the TV and shows a spinner and first-request explanation before a code is ready. Pairing trust continues to be stored per TV host on this phone. Changing TVs clears stale local code/success UI.

On iOS, Data.removeFirst leaves nonzero indices. Clearing `0..<count` after streaming could trap on microphone Stop. Cleanup now clears the actual startIndex..<endIndex range and ignores repeated native Stop requests; engine lifecycle cleanup is dispatched to main. Controller cleanup failures still end the TV session and return idle. A five-second first-audio watchdog reports missing PCM instead of silently displaying an indefinite recording state. A successful RPC chunk indicates delivery to the client transport, not confirmed speech recognition by the TV.

Host checks ran the installed Swift AVAudioConverter with synthetic PCM and the actual Swift capture encryption/append/stop code (iOS-only AVAudioSession setup excluded on macOS). PKCS#1/OAEP-SHA256/AES-GCM packets decrypted into the original PCM, including residual audio and repeated stop. Direct TLS framing follows androidtvremote2's voice implementation: 16-bit mono PCM at 8 kHz, 8 KiB minimum frames, 20 KiB maximum. This evidence is not a physical microphone/Assistant test.
