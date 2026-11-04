# Hosted remote and demo

`https://aurea.xcenter.it/` defaults to the remote. The developer Preview launcher
entry (three version taps) opens the shared demo; `?demo=1` is a direct demo link.
Native companions keep their existing remote-first dispatch. A demo Remote panel
shows a link which another browser can pair with; preview trust/state is in-memory
and never routes commands to a physical TV.

On TV, open Remote settings → Connect from aurea.xcenter.it. This explicitly enables
the hosted connection, which is retained across service restarts. The link's `#tv=`
value is a rendezvous ID, not a control credential. A remote still requests pairing
and must enter the code displayed on the television. The existing HTTP authentication,
origin binding, PIN expiry, rate limits, encrypted trust store and revocation remain
authoritative. Requests are forwarded over a fixed loopback route allowlist.

A non-navigable service-owned WebView runs the bundled PeerJS 1.5.5 client for Android
WebRTC data channels. It exposes a bounded Java interface only to the local bundled
host document, not external pages. Frames, concurrent links and pending operations
are bounded; only approved operations can reach the existing remote server. Buttons
are not replayed after connection recovery. The WebView closes with the service.

The XCenter Node PeerServer binds loopback 8792, with discovery disabled, a finite
connection limit and its own systemd unit. Nginx exposes HTTPS/WSS `/peer`. Signaling
exchanges connection metadata; authenticated application data uses WebRTC's DTLS.
Google's public STUN service assists candidate discovery; it is not a media relay.
There is no TURN server, so incompatible NAT/firewalls can prevent a connection.
Use the direct TV-address remote on the same LAN as fallback. Browsers do not open
Remote Service raw TLS. Native companions should use the LAN address for their
direct system-control connection; browser WebRTC is a separate transport.

`deploy/` contains reproducible nginx/systemd configuration. Preserve older static
releases and the previous `current` symlink before activation. Existing Velunivo
services, source edits and PeerServer must remain untouched.
