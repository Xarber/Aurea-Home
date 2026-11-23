# Aurea account integration verification

This report covers AUREA-011 and UADS-SEC-003 and UADS-SEC-004. The checked source commit is `ac1382b` on `testing`. The sign-in, backup and approved-TV invitation implementations use existing account and device trust boundaries.

| Check | Evidence |
|---|---|
| TypeScript and shared Expo source tests | TypeScript passed. All 63 Expo source tests passed, including pairing against the approved TV identity. |
| Account HTTP and invitation tests | Five passed locally and on X-Center’s Node 24 appliance runtime. Tests cover web and phone callback binding, token isolation, replay, revocation, one-use TV grants and wrong-account access. |
| Android trust helper | Host compilation and checks passed for the single-use grant, origin and hosted bridge proof, expiry and cancellation. The broader host check skipped eight unrelated protocol/crypto cases when their dependencies were unavailable. |
| Browser UI | A fresh export passed the Chromium test for opening hosted account settings, loading a remote backup, restoring its preferences and discovering the approved TV. The first run needed an exact button-label match in the test. The browser routed account responses to fixtures. |
| X-Center staging | The isolated account snapshot installed its locked dependencies, loaded the OIDC module and passed service unit and Nginx syntax checks. The existing signaling unit remained active. The public session URL returned the existing static HTML. |
| UADS declaration | The schema validator checked 53 requirement entries. The security requirements remain Pending for live provider and device verification. |

GitHub [source quality](https://github.com/Xarber/Aurea-Home/actions/runs/45228089238) passed governance, dependency audit and source checks. The [native verification build](https://github.com/Xarber/Aurea-Home/actions/runs/45228170005) was running at the checkpoint. It cannot publish from `testing`.

Live credential provisioning, provider consent, passkeys and physical security keys, camera/QR, phone browser handoff, production settings, physical-TV pairing and per-remote revocation still need validation. The protected Aurea credential was absent on X-Center during staging. UADS §27 requires authorization to rotate the previously shared client secret. The public Nginx route and running services were left as observed.


## Live backend follow-up

At the user's direction the original client secret was provisioned in the root-only configuration on X-Center. The account implementation at `ac1382b` is active, with its previous Nginx configuration retained separately for rollback. Discovery, the issuer-authenticated TV device-code request, the public session endpoint, the browser authorization redirect with S256 PKCE and the exact registered callback, and unauthenticated preferences rejection were verified. The first proxy probe reached an old Nginx worker and restored the previous config. A retry waited for the new worker and verified the endpoint. The peer service remained active. The hosted frontend still serves `7171ca61a1e8e7472638240ac30c7859a91e3523`.

The previous native workflow completed with both iOS builds successful. All Android variants failed at `TVPlatform.java` on the missing `ByteArrayOutputStream` import, since corrected in source. User sign-in, consent, settings writes and physical-device verification remain open.
