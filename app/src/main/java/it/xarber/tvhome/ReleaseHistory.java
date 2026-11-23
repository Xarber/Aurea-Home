// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xarber
package it.xarber.tvhome;

import android.content.Context;
import android.content.SharedPreferences;
import io.github.jqssun.airplay.BuildConfig;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;

/** Shared source for the update popup and permanent, localized release history. */
final class ReleaseHistory {
    static JSONArray entries(Context context) {
        try (InputStream input = context.getAssets().open("release-history.json")) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] chunk = new byte[4096]; int count;
            while ((count = input.read(chunk)) != -1) output.write(chunk, 0, count);
            return new JSONObject(output.toString("UTF-8")).getJSONArray("releases");
        } catch (Exception error) { return new JSONArray(); }
    }
    static String localized(Context context, JSONObject object, String key) {
        JSONObject value = object.optJSONObject(key);
        return value == null ? "" : value.optString(AppLanguage.code(context), value.optString("en"));
    }
    static String lastSeenRelease(Context context) {
        SharedPreferences state = context.getSharedPreferences("release_history", 0);
        String seen = state.getString("seen-release", "");
        if (!seen.isEmpty()) return seen;
        int legacy = state.getInt("seen", -1);
        JSONArray available = entries(context);
        for (int index = 0; index < available.length(); index++) {
            JSONObject item = available.optJSONObject(index);
            if (item != null && item.optInt("code") <= legacy) return item.optString("version");
        }
        return "";
    }

    static boolean pending(Context context) {
        String seen = lastSeenRelease(context);
        if (BuildConfig.VERSION_NAME.equals(seen)) return false;
        if (seen.isEmpty()) {
            try {
                android.content.pm.PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
                if (info.lastUpdateTime <= info.firstInstallTime) return false;
            } catch (android.content.pm.PackageManager.NameNotFoundException unavailable) { return false; }
        }
        JSONObject current=entries(context).optJSONObject(0);
        if (current == null || !BuildConfig.VERSION_NAME.equals(current.optString("version")) ||
            current.optJSONArray("features") == null || current.optJSONArray("features").length() == 0) return false;
        return previousVersion(context) < current.optInt("code");
    }

    static int previousVersion(Context context) {
        String version = lastSeenRelease(context);
        JSONArray available = entries(context);
        for (int index = 0; index < available.length(); index++) {
            JSONObject item = available.optJSONObject(index);
            if (item != null && version.equals(item.optString("version"))) return item.optInt("code");
        }
        return 0;
    }

    static void markSeen(Context context) {
        context.getSharedPreferences("release_history", 0).edit()
            .putInt("seen", BuildConfig.VERSION_CODE).putString("seen-release", BuildConfig.VERSION_NAME).apply();
    }
    private ReleaseHistory() {}
}
