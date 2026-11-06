# Private, TV-approved app preview

Aurea 2.2.0 adds **Private app preview** to the phone/web remote's selected-TV settings. Start opens an encrypted peer session and brings Aurea Home forward on the television to request approval. The TV shows an explanation, an optional app-audio permission prompt and Android's MediaProjection consent. No capture starts before the OS grants consent. The user can decline. Consent is never remembered or automatically renewed.

The panel provides app selection and navigation through the original remote connection while images/audio use a separate peer connection. Home/launch behavior and native system pairing remain independent of the preview. Android 14+ users who want to switch captured apps must choose the entire-display option in Android's chooser; choosing one app limits capture to that app. Capture stops on the TV notification's Stop action, viewer Stop/close/background, changing selected TV, parent pairing revocation, process/service termination, two minutes of sharing or eight seconds without media polls. Approval requests expire after one minute.

## Platform limits

Only ordinary Android app display content is eligible. There is no supported generic capture API for the television's HDMI hardware path. Protected/secure app surfaces may appear blank. Audio uses Android 10+ AudioPlaybackCapture for permitted MEDIA/GAME playback in the same user profile. Apps can block audio or video capture; silence/blank content is not bypassed. Earlier Android versions fall back to video without playback audio. Availability of the system capture UI was observed on the user's Android 10 TV; actual capture/audio on that device still needs the new binary and user approval. This is a small preview (480-pixel width, at most four JPEG frames per second), not a high-quality video casting implementation. Audio and snapshots are best-effort; no frame-accurate AV synchronization is claimed.

## Privacy and transport

`AppPreviewService` owns MediaProjection, ImageReader and optional AudioRecord. Encoded images and a bounded audio ring remain in memory. It creates no recording files. Native phones register react-native-webrtc 155.0.1 lazily for encrypted data channels (the TV host excludes that native dependency and keeps its existing isolated WebView). No phone camera, microphone or screen-capture API is called for viewing. Native viewer audio uses the existing platform-audio adapter with a bounded PreviewSpeaker/AudioTrack; web uses AudioContext. These receive playback PCM only and do not turn on the viewer's microphone. Sensitive payloads are excluded from diagnostics, Ideas and service-worker caches.

The primary authenticated remote connection issues an ephemeral, scoped ticket tied to the existing parent pairing. The ticket can only start/read/end this preview and expires after 150 seconds; it cannot navigate, launch apps, revoke trust or read a catalog. Parent revocation invalidates it. Media routes reject regular remote tokens, remote HTTP callers, incorrect origin, expired/revoked tickets and absent/incorrect server-only relay proof. `HostedRemote` adds that process-local proof after receiving an encrypted WebRTC message; it is never given to the client or signaling server. Ownership is derived on the TV from the authenticated parent, not from caller-supplied owner text. `PreviewAccess` contains the pure transport/lease policy.

Media crosses WebRTC DTLS data channels between endpoints. XCenter coordinates connections and does not receive images or audio. No TURN relay is configured; networks that cannot establish a peer connection fail closed. When hosted remote was not already enabled, its preview host is temporary and is released after the ticket window without changing the saved hosted-remote preference. Already enabled hosted remote remains running.

The ticket is requested through the user's existing remote transport. A direct LAN HTTP remote therefore retains its existing trusted-LAN/control-token interception limitation; this does not provide protection against a compromised LAN or compromised paired device. Use the HTTPS hosted remote when the complete control/authorization path must also be encrypted. Do not describe that LAN bootstrap as end-to-end authenticated HTTPS. The media itself is never returned by the public/plain LAN API.

## Modules and routes

- `AppPreviewService.java`: TV capture, consent lifecycle, notification, bounded media and expiry.
- `MainActivity.kt`: interactive, request-bound TV approval and Android system consent.
- `PreviewAccess.java`: transport proof and capture lease validation.
- `HomeRemoteServer`: scoped ticket creation and peer-only media routing.
- `HostedRemote`: finite RPC forwarding with a server-only proof.
- `src/remote/preview/PreviewSession.ts`: transport-independent viewer lifecycle, cancellation, frame/audio sequence handling and bounds.
- `PreviewPanel.tsx` and `audio(.native).ts`: UI and platform playback adapters.

`POST /api/preview/ticket` requires the normal paired token and returns only a temporary peer URL/ticket. Peer-only `/api/preview/start`, `/api/preview/frame`, `/api/preview/end` use that ticket. Frames include status, monotonically increasing image/audio sequences, optional bounded JPEG data URI and up to six PCM chunks (16 kHz, mono, signed 16-bit LE). A frame request supplies imageAfter/audioAfter; the viewer deduplicates audio and never replays a failed capture-start action. Media is cleared on stop. No public record of a session or recording is published.

## Validation

Host policy checks cover expired/revoked tickets, wrong origins/proofs, cleartext callers and capture lifetime. Viewer tests use isolated synthetic transports to verify invalid endpoint rejection, cancellation, TV denial, audio deduplication and pixel cleanup. Affected Java capture/server/relay classes compiled against the installed Android SDK with narrow host-service stubs. Browser tests cover the user interface and refusal to connect an invalid ticket; they are not real TV capture tests. Full native compilation runs in GitHub Actions. Physical TV approval/capture/eligible audio and iOS/Android viewer playback remain required runtime checks.
