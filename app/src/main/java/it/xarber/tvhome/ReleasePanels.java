// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xarber
package it.xarber.tvhome;

import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;

/** Icon-led release presentation using the launcher's existing accessible, focusable controls. */
final class ReleasePanels {
    static void appendHistory(LegacyHomeActivity host, LinearLayout rows) {
        JSONArray releases = ReleaseHistory.entries(host);
        for (int i = 0; i < releases.length(); i++) {
            JSONObject release = releases.optJSONObject(i);
            if (release == null || release.optInt("code") > io.github.jqssun.airplay.BuildConfig.VERSION_CODE) continue;
            label(host,rows,release.optString("version")+" · "+provenance(host,release));
            int shown = overviewFeatures(host,rows,release,3);
            if (shown<3) overviewFixes(host,rows,release);
            host.addControlIcon(rows, "Full changelog", release.optString("version"), "history", () -> {
                host.closePanel(); host.showRelease(release);
            });
        }
    }

    static void appendUpdate(LegacyHomeActivity host, LinearLayout rows, int previous) {
        JSONArray releases = ReleaseHistory.entries(host);
        JSONObject latest = releases.optJSONObject(0);
        if (latest == null) return;
        label(host, rows, latest.optString("version"));
        int shown = overviewFeatures(host,rows,latest,3);
        for (int index=1; index<releases.length() && shown<3; index++) {
            JSONObject earlier = releases.optJSONObject(index);
            if (earlier != null && previous>0 && earlier.optInt("code")>previous) {
                shown += overviewFeatures(host,rows,earlier,3-shown);
            }
        }
        if (shown<3) overviewFixes(host,rows,latest);
    }

    private static String provenance(LegacyHomeActivity host, JSONObject release) {
        JSONArray publications = release.optJSONArray("publications");
        JSONObject published = publications == null ? null : publications.optJSONObject(0);
        if (published != null) {
            return published.optString("date")+" · "+host.tr("stable".equals(published.optString("channel"))?"Stable":"Beta");
        }
        return release.optString("date")+" · "+host.tr("development".equals(release.optString("record"))?"Development":"Reconstructed history");
    }

    private static int overviewFeatures(LegacyHomeActivity host, LinearLayout rows, JSONObject release, int limit) {
        JSONArray features = release.optJSONArray("features");
        if (features == null) return 0;
        int shown=0;
        for (int i=0; i<features.length() && shown<limit; i++) {
            JSONObject feature=features.optJSONObject(i);
            if (feature == null) continue;
            label(host, rows, ReleaseHistory.localized(host,feature,"label"));
            label(host, rows, ReleaseHistory.localized(host,feature,"detail"));
            shown++;
        }
        return shown;
    }

    private static void overviewFixes(LegacyHomeActivity host, LinearLayout rows, JSONObject release) {
        String fixes = ReleaseHistory.localized(host,release,"fixes");
        if (!fixes.isEmpty()) label(host,rows,host.tr("Fixes & Improvements")+"\n"+fixes);
    }

    static void appendRelease(LegacyHomeActivity host, LinearLayout rows, JSONObject release) {
        label(host, rows, provenance(host,release));
        features(host, rows, release);
        disclosure(host, rows, host.tr("Fixes & Improvements"), "bug", ReleaseHistory.localized(host, release, "fixes"));
        // Compatibility is visible, never hidden behind optional help.
        String compatibility = ReleaseHistory.localized(host, release, "compatibility");
        if (!compatibility.isEmpty()) label(host, rows, host.tr("Compatibility") + "\n" + compatibility);
    }
    private static void features(LegacyHomeActivity host, LinearLayout rows, JSONObject release) {
        JSONArray features = release.optJSONArray("features");
        if (features == null) return;
        for (int i = 0; i < features.length(); i++) {
            JSONObject feature = features.optJSONObject(i);
            if (feature != null) disclosure(host, rows, ReleaseHistory.localized(host, feature, "label"), feature.optString("icon", "info"), ReleaseHistory.localized(host, feature, "detail"));
        }
    }
    private static void disclosure(LegacyHomeActivity host, LinearLayout rows, String title, String icon, String detail) {
        TextView body = host.text(detail, 13, LegacyHomeActivity.MUTED);
        body.setPadding(host.dp(16), host.dp(8), host.dp(10), host.dp(10));
        body.setLineSpacing(host.dp(3), 1);
        body.setVisibility(View.GONE);
        final TextView[] trigger = new TextView[1];
        host.addControlIcon(rows, title, "", icon, () -> {
            boolean expanded = body.getVisibility() != View.VISIBLE;
            body.setVisibility(expanded ? View.VISIBLE : View.GONE);
            trigger[0].setContentDescription(title + ", " + host.tr(expanded ? "Expanded" : "Collapsed"));
            trigger[0].requestFocus();
        });
        trigger[0] = (TextView) rows.getChildAt(rows.getChildCount() - 1);
        trigger[0].setContentDescription(title + ", " + host.tr("Collapsed"));
        rows.addView(body, host.lp(-1, -2));
    }
    private static void label(LegacyHomeActivity host, LinearLayout rows, String text) {
        TextView label = host.text(text, 13, LegacyHomeActivity.MUTED);
        label.setPadding(0, host.dp(8), 0, host.dp(8));
        rows.addView(label, host.lp(-1, -2));
    }
    private ReleasePanels() {}
}
