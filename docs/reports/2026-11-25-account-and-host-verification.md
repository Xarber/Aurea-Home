# Aurea account service and host verification

On 25 November 2026, the X-Center appliance deployed the account service from Aurea revision `0818f70c51a041259bd7b67a47e2f5d62ef00b90`. The existing account registration and credential were reused. The deployment used the mounted application disk, a separate loopback staging process, and a private renewable-session directory on the mounted data disk. The original service unit and deployment target were retained in the Aurea account rollback directory.

| Check | Observed result |
| --- | --- |
| Local and isolated-host account tests | All 10 passed, including renewal concurrency, session recovery, device proof and private backup scope. |
| Live HTTPS web account entry | Unsigned session reported available. Both forms of authorization requested S256. The opt-in request alone requested `offline_access`. An untrusted origin was rejected. |
| Live native phone and TV entry | Both started, reported an authorization pending, canceled, and rejected pickup after cancellation. The phone handoff requested the renewal scope. No real credentials or test authorization codes were recorded. |
| Stable web interface | Version 2.1.0 at commit `7171ca61` does not show account controls. A separate local Chromium context replayed the existing 2.3.0 Actions artifact `deb0f14` against the live account endpoint. Its basic sign-in button was visible at widths 1280 and 390. That older artifact predates the renewal checkbox. |
| Native build setup | The GitHub repository setting `AUREA_ACCOUNTS_ENABLED` was set to `1` and read back. Device and phone packages still require a current build and runtime verification. |
| Appliance cleanup | About 2 GB of reclaimable Docker build cache plus 109 MB of root npm cache were removed. Root free space measured 2,754,199,552 bytes after cleanup. Docker reported the same 27 images, 81 containers and two volumes. Account, signaling and Nginx remained active. |

Live consent, physical passkey and security-key tests, settings restoration on production data, and same-account pairing across real TV, iOS, Android and browser still require authenticated test sessions and hardware. ADB listed no connected devices. The account service update also invalidated old in-memory product sessions, which were already non-renewable. The public app has not yet been updated. [Hosted Aurea](https://aurea.xcenter.it), [previously verified browser build](https://github.com/Xarber/Aurea-Home/actions/runs/45336116418), [account revision source checks](https://github.com/Xarber/Aurea-Home/actions/runs/45699499413).
