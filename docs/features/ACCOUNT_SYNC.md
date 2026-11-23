# X-Center ID and Aurea settings

Aurea Remote's hosted web Settings contains an optional X-Center ID entry when the account service is enabled. The first implementation saves and restores the remote layout and touchpad choice on demand. It checks the cloud record revision before replacing or deleting it. Restoring is explicit. Local settings and pairing work without an account.

The product has its own Website backend registration with callback `https://aurea.xcenter.it/account/callback`. The portal shows Aurea Home as active and Verified app. Public DNS returned the matching TXT record. The TXT owner is `_xcenter-id.aurea.xcenter.it`. The portal challenge is `xcenter-id=84c8a0d1-ccdb-4874-b935-2de36a905fcd`. The account service has not been provisioned or deployed.

## Service and trust boundary

`server/account/start.mjs` is a separate loopback process. Once verified, configure `AUREA_XCENTER_CLIENT_ID`, `AUREA_XCENTER_CLIENT_SECRET` in protected server configuration, plus `AUREA_ACCOUNT_ENABLED=1`. Route `/account/` to port 8793 behind Aurea's HTTPS origin. Disable request logging there because callback queries contain one-time codes. Leave the signaling process unchanged. Roll back by removing the account route and stopping only the account service.

The backend owns the exact HTTPS callback, authorization-code exchange with S256 PKCE and nonce, issuer verification, and UserInfo check. It requests `openid profile app_data`. Browser-bound authorization transactions are short-lived and consumed once. The product issues a Secure, HttpOnly, SameSite cookie for its own session. Product sessions and issuer access tokens stay in process memory and expire with the issuer token or after an hour. Restarting the process signs out current browser sessions. Origin checks guard state-changing requests. Cloud records are private and scoped by the issuer access token with an allowlist of two presentation settings. The service has a second allowlisted private record for TV language and wallpaper, animation, blur and activity appearance. It has no operations for sharing settings, TV credentials, IP addresses, profiles or viewing history. Demonstration and developer-server sessions do not expose this settings entry.

Production checks still required include provider consent, real account data access and revocation, passkey and external FIDO sign-in, cancellation, and the browser settings flow against the activated callback. Auth-provider tests use a local substitute and do not establish provider behavior.

## Next integration slices

The gated TV settings panel implements QR/device-code sign-in and TV appearance backup. It uses a distinct server-side record and proves possession of a TV-generated verifier to redeem the sign-in once. Product sessions on TV are memory-only. Enable the panel with `EXPO_PUBLIC_AUREA_ACCOUNTS_ENABLED=1` only after safe staging. Native build, runtime consent and backup/restore checks remain open. Dock and per-device input mappings are outside this first settings record. Native phone sign-in needs a secure system-browser handoff. Account-assisted pairing needs TV enrollment, explicit approval for each new remote, and a short-lived authorization bound to both installations. Exchange that authorization for a fresh per-device remote credential locally or over the already supported direct peer connection. A shared account, a synced TV label or knowledge of a peer ID alone cannot authorize TV commands. Per-remote revocation and expiry must be tested before enabling the flow.

## Verification status

The TypeScript check and three local HTTP/device-login unit tests passed. They cover origin and browser binding, callback replay, per-account record access, write conflicts, logout, device proof, denial and cancellation. The server production dependency audit found zero vulnerabilities. These tests do not authenticate against live X-Center ID. The tested source does not enable production auth or change native device trust.
