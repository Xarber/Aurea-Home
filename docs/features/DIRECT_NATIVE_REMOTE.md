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
