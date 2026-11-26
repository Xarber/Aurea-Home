// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** The phone package has no TV usage capability or Usage Access permission. */
final class AppUsageSummary {
    private AppUsageSummary() {}

    static JSONObject read(Context context, JSONArray catalog) throws JSONException {
        return new JSONObject().put("status", "unavailable");
    }
}
