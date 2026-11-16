# Hosted web entry

The first visit to the X-Center Aurea root presents the landing page. Open Web App offers a skippable introduction before opening the remote. The browser remembers entry and introduction completion separately. About Aurea and Replay Introduction remain available after entry. The mounted remote retains its state when the information page opens.

The hosted shell only applies to the clean root at `aurea.xcenter.it`. The direct demo, direct remote, pairing links and TV-served remote use their existing entry points. Native builds resolve a pass-through module and have no website shell.

The page queries the public GitHub stable-release endpoint without credentials. It displays only uploaded APK and IPA files matching the release tag, expected package naming and exact GitHub asset URL. It excludes drafts, prereleases and metadata tags. The unsigned iOS download requires external signing. The browser install action depends on the browser's install event. Safari on iPhone and iPad also has a manual installation path.

The introduction uses existing screenshots captured from the web demo. Native onboarding, current device-specific captures and installation through external clients still require verification.

Browser screenshot routes and device dimensions are defined in `config/web-screenshots.json`. With the Expo export served locally, run `node scripts/expo/capture-web-screenshots.mjs all` to render isolated candidates into `build/web-screenshots`. Review images before replacing their public counterparts. The production export checks public image dimensions, and the browser workflow retains fresh candidates by commit.

The landing and README use the upstream [AltDirect badge](https://altdirect.app/assets/png/AltSource_Blue.png) and [Obtainium badge](https://wiki.obtainium.imranr.dev/deep_links/#badging-your-project). Obtainium's HTTPS redirect provides an installation fallback. Each link encodes the matching TV or phone configuration, keeping the package filters distinct. These links still require a compatible installed client to verify imports end to end.
