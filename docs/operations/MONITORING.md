# Aurea service monitoring

X-Center serves the static web export and proxies PeerServer through Nginx. Check HTTPS at the public root and verify that the published build metadata matches the intended commit. Check the signaling endpoint with a disposable test peer and the documented demo bridge scenario. A page response alone does not verify pairing or the data channel.

For a failed check, inspect Nginx and the `aurea-peer` systemd unit. Record timestamps, HTTP status, deployment commit and the failure class. Keep pairing codes, tokens and TV identities out of incident evidence. Proposed alert trigger is three consecutive failed readiness probes one minute apart. Alert delivery and ownership still need verification on X-Center.
