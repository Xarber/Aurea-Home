# Aurea device feedback and follow-up

The user confirmed the update preserved installed data and that Apple TV app navigation worked. They reported the account UI differed from the native overview, the Apple TV handset did not show usable controls, and the remote keyboard did not work. They expected Keep Watching on Home. Profile isolation and AirPlay were not tested in that session.

## Corrections

- Reused the X-Center ID overview design for account entry and details, with Aurea’s existing device and browser sign-in. Renewable credentials are requested by default. X-Center ID owns consent.
- Added a bounded Apple TV handset with directional navigation, playback, volume and separate Home controls. Opening the explicitly configured input through Aurea starts Apple TV mode. The manual switch remains available. Third-party source changes are not exposed reliably on all Android TVs.
- Added a **Keep Watching** shelf above the Home-profile dock. Visible titles open their original app. The shelf heading opens the full list even if Android reports no titles.
- Fixed the native phone keyboard’s IME counters, wide signed status parsing and insertion cursor. Queued edits and submission stay on the same TV and field. Your native phone must have local system controls connected.
- Prior run [45704182129](https://github.com/Xarber/Aurea-Home/actions/runs/45704182129) failed lint in the Android phone jobs. The TV usage reader was included in those sources even though the phone manifest correctly lacks Usage Access. The real reader now compiles only in the TV package. The phone gets a capability stub and keeps its existing permissions.

## Physical checks

1. In TV and phone settings, open **X-Center ID**, sign in and open **Manage account & data**. Cancel one attempt and confirm the device can start another. Try the hosted web flow once that version is deployed. Confirm there is no Stay signed in switch.
2. With a paired Apple TV and its HDMI configured in Aurea, open the input from the TV dock, then repeat from the phone remote’s Inputs tab. Confirm the directional pad, Back, playback, tvOS Home and Aurea Home are distinct. Switch back to Aurea controls manually and confirm another input or Aurea Home clears the automatic mode.
3. On Home, navigate up from the dock to **Keep Watching**. Open a title when one is published. Select the heading if the shelf is empty and verify the full list or clear unavailable state.
4. In the native phone remote, with paired system controls on the same Wi-Fi, select a TV search box. Verify the phone keyboard opens, then type two letters quickly, paste, delete, and submit. Open a second field and confirm it starts with a clear local editor. Try at least the TV app list or launcher search and one streaming app. Browser-only sessions do not have the phone's direct keyboard transport.
