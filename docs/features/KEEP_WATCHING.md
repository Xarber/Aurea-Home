# Keep Watching

Open **Control Center → Keep Watching** on an Android TV using the Home household profile. Aurea requests the device's Android Watch Next rows and shows resumable and next-episode records that have a safe, resolvable link back into the publishing app. It displays playback progress only when the publisher supplies both a position and duration. Choose a row to open it or hide it from Aurea. A hidden entry can return when the publisher reports newer activity.

This read-only integration never changes the Android Watch Next provider. A TV may restrict third-party launchers to their own rows or deny access. The feature shows an empty or unavailable state in those cases. It requires no extra privileges, viewing history is excluded from snapshots and account sync, and secondary household profiles cannot see the TV-global feed. A selected link is reconstructed as a plain VIEW intent restricted to its publisher. Content and file schemes, embedded components, arbitrary extras and nested intents are excluded. The publisher decides whether it can resume the program.

## Plex

Open **Plex Continue Watching** from Keep Watching to connect a Plex server for the current household profile. Enter the server’s HTTPS origin and its Plex access token. The TV verifies the connection and stores the token in Android Keystore-backed storage specific to that profile. The token is sent only to the chosen origin and is never included in account sync or a portable settings export. Disconnecting Plex removes the local credential.

Aurea reads up to 20 movies or episodes from the documented Plex Continue Watching endpoint. **Open Plex app** launches the installed Plex app. Opening or resuming an individual Plex title still needs a verified client deep link. [Plex Media Server API](https://developer.plex.tv/pms/)

Per-profile history, Stremio-specific continuation sources, title availability, recommendations and imports remain tracked in the active queue. The observed visibility and playback behavior of any particular streaming app needs verification on that TV. [Android Watch Next reference](https://developer.android.com/reference/android/media/tv/TvContract.WatchNextPrograms)
