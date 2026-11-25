#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-only
set -euo pipefail
cd "$(dirname "$0")/.."
check_dir="$(mktemp -d)"
trap 'rm -rf "$check_dir"' EXIT
javac -d "$check_dir" app/src/main/java/it/xarber/tvhome/HomeDevicePolicy.java tests/host/HomeDevicePolicyChecks.java app/src/main/java/it/xarber/tvhome/QuietHours.java tests/host/QuietHoursChecks.java app/src/main/java/it/xarber/tvhome/CameraFrames.java tests/host/CameraFramesChecks.java app/src/main/java/it/xarber/tvhome/GuestWifi.java tests/host/GuestWifiChecks.java app/src/main/java/it/xarber/tvhome/ViewingExportCsv.java tests/host/ViewingExportCsvChecks.java app/src/main/java/it/xarber/tvhome/WatchHistoryPolicy.java tests/host/WatchHistoryChecks.java app/src/main/java/it/xarber/tvhome/AutomationProof.java tests/host/AutomationProofChecks.java app/src/main/java/it/xarber/tvhome/AccountInvitation.java tests/host/AccountInvitationChecks.java app/src/main/java/it/xarber/tvhome/PreviewAccess.java tests/host/PreviewAccessChecks.java app/src/main/java/it/xarber/tvhome/diagnostics/DeveloperSession.java app/src/main/java/it/xarber/tvhome/RemoteRequest.java tests/host/HostChecks.java app/src/main/java/it/xarber/tvhome/updates/UpdatePolicy.java tests/host/UpdatePolicyChecks.java app/src/main/java/it/xarber/tvhome/playback/PairingAttempt.java tests/host/PairingAttemptChecks.java app/src/main/java/it/xarber/tvhome/playback/MusicActivityClock.java tests/host/MusicActivityChecks.java app/src/main/java/it/xarber/tvhome/RemoteKeys.java tests/host/RemoteKeysChecks.java
java -cp "$check_dir" it.xarber.tvhome.HomeDevicePolicyChecks
java -cp "$check_dir" it.xarber.tvhome.QuietHoursChecks
java -cp "$check_dir" it.xarber.tvhome.CameraFramesChecks
java -cp "$check_dir" it.xarber.tvhome.GuestWifiChecks
java -cp "$check_dir" it.xarber.tvhome.AccountInvitationChecks
java -cp "$check_dir" it.xarber.tvhome.AutomationProofChecks
java -cp "$check_dir" it.xarber.tvhome.WatchHistoryChecks
java -cp "$check_dir" it.xarber.tvhome.ViewingExportCsvChecks
node --test integrations/homebridge/client.test.cjs
java -cp "$check_dir" it.xarber.tvhome.HostChecks
java -cp "$check_dir" it.xarber.tvhome.updates.UpdatePolicyChecks
java -cp "$check_dir" it.xarber.tvhome.playback.PairingAttemptChecks
java -cp "$check_dir" it.xarber.tvhome.playback.MusicActivityChecks
java -cp "$check_dir" it.xarber.tvhome.RemoteKeysChecks
python3 scripts/release.py check

python3 -m unittest discover -s tests/python -v

java -cp "$check_dir" it.xarber.tvhome.PreviewAccessChecks
