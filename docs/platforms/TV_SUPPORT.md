# TV and player compatibility

Use the operating system shown in device settings to choose a setup path. The same TV brand can ship different operating systems.

| Family | Aurea mode | Known dependencies and validation |
| --- | --- | --- |
| Google TV, Android TV | Native Home replacement and Aurea phone or web remote | Defaults and permissions are firmware-specific. For navigation inside third-party apps, use Android TV Remote Service or an explicitly enabled local bridge as applicable. The user's Android 10 TV needs a current package and physical regression check. |
| Apple TV with tvOS | Paired-player control from Android TV or Aurea Remote | App list and navigation need compatible Companion pairing. tvOS Home remains Apple’s system Home. |
| Roku TV and players | Native phone remote using ECP | Manual private IP, port 8060. Device must allow mobile app control. Volume and power-off buttons depend on advertised capabilities. Protocol fixtures pass and real devices remain unverified. |
| Fire TV on Fire OS | Android-derived platform under review | Amazon controls the Home destination. Android TV Remote Service compatibility cannot be assumed. Test an actual generation before claiming launcher or remote compatibility. |
| Fire TV on Vega OS | No Aurea host package | Android APKs are not the native TV app format. |
| Samsung Tizen, LG webOS | No Aurea host package | These require separate applications or explicit receiver integrations. Expo Android packages cannot be installed as their system Home. |
| VIDAA, Philips Saphi and Titan, Panasonic, VIZIO and TiVo | Model-specific research required | No default device control or Home replacement is certified. A browser session can only provide the features supported by that browser. |

A Home Assistant installation may expose compatible lights, climate, speakers or other controls to Aurea independently of television model. That does not establish that the native launcher runs on the brand's other platforms. [Couch TV platform baseline](https://github.com/Seagey/couch-tv/blob/b3d45ab/docs/PLATFORMS.md), [Roku ECP](https://developer.roku.com/dev/docs/external-control-api).
