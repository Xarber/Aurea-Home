// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

/** Local advertisement settings, separate from paired Apple TV credentials. */
public final class ReceiverSettings {
    private ReceiverSettings() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("settings", Context.MODE_PRIVATE);
    }

    public static boolean enabled(Context context) {
        return prefs(context).getBoolean("launcher_receiver_enabled", true);
    }

    public static String name(Context context) {
        String custom = prefs(context).getString("launcher_receiver_name", "");
        return custom.isEmpty() ? DeviceName.read(context) : custom;
    }

    static JSONObject state(Context context) throws Exception {
        return new JSONObject().put("enabled", enabled(context)).put("name", name(context))
            .put("customName", prefs(context).getString("launcher_receiver_name", ""));
    }

    static void save(Context context, JSONObject data) throws Exception {
        SharedPreferences.Editor edit = prefs(context).edit();
        if (data.has("enabled")) edit.putBoolean("launcher_receiver_enabled", data.getBoolean("enabled"));
        if (data.has("name")) {
            String name = data.getString("name").trim();
            if (name.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 63 ||
                name.codePoints().anyMatch(Character::isISOControl)) {
                throw new IllegalArgumentException("invalid_receiver_name");
            }
            edit.putString("launcher_receiver_name", name);
        }
        if (!edit.commit()) throw new IllegalStateException("storage_failed");
    }
}
