# Optional TV-local ADB buttons

The user authorized this capability separately from existing Remote Service trust.
It is disabled by default. In the companion's System controls panel, **Enable local
control** generates an app-owned RSA-2048 identity in Android Keystore and contacts
only `127.0.0.1:5555`. Accept Android's normal debugging authorization on the TV,
then select Retry. USB debugging alone does not guarantee a TCP listener on every
TV; devices without that listener report unavailable. No PC is needed after setup.

The authenticated HTTP/WebRTC API exposes one enable/disable operation. It never
accepts a shell string, destination, file path, key code, private key or port.
`LocalAdbController` implements bounded ADB AUTH/CNXN/OPEN/WRTE/CLSE framing and
executes only `input keyevent` with a fixed key-name-to-Android-code allowlist.
Packets, checksums, stream IDs, output and timeouts are bounded. An uncertain
button is never replayed. Pending authorization requires an explicit retry.

The ADB identity grants debugging trust at Android's boundary: approve only on a
trusted TV/network. The launcher restricts its exposed functionality to buttons;
that does not reduce what Android's underlying debugging identity represents.
Disable closes its connection and prevents further use. The app-owned key remains
in Keystore for later use; Android Developer options can revoke debugging trust
(the system action can also revoke other computers). App update preserves identity.

ADB does **not** inject phone microphone audio. Remote state distinguishes button
readiness from voice readiness. Home-local commands retain their existing UI path;
non-Home/system-only keys use the opted-in bridge. The old Remote v2 transport is
preserved for TVs that support self-origin connections.

Physical Android authorization and third-party-app button verification remain
required. Host compilation and browser fixtures cannot establish that result.
