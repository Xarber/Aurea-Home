# Aurea recovery

Preserve the previous static export and its source commit before switching the X-Center deployment symlink. Restore that export and verify root metadata, PWA update behavior and signaling. PeerServer holds transient signaling state. Reconnecting clients establish their sessions again after recovery. Preserve deployment definitions in Git and keep TLS and host credentials in their separate authorized backup system.

For native regressions, ship a corrective build with a higher version code and the existing signing identity. Do not clear user data or rely on a downgrade. Suggested hosted targets are 30 minutes to restore and recovery to the last validated deployment. No timed production restore drill was performed.
