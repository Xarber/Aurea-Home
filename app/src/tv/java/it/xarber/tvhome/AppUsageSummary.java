// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.os.Process;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/** Pulls Android's device-wide daily foreground estimate on demand and never stores it. */
final class AppUsageSummary {
    private AppUsageSummary() {}

    static boolean granted(Context context) {
        AppOpsManager permissions = context.getSystemService(AppOpsManager.class);
        return permissions != null && permissions.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.getPackageName()
        ) == AppOpsManager.MODE_ALLOWED;
    }

    static JSONObject read(Context context, JSONArray catalog) throws Exception {
        if (!granted(context)) return new JSONObject().put("status", "permission");
        UsageStatsManager manager = context.getSystemService(UsageStatsManager.class);
        if (manager == null) return new JSONObject().put("status", "unavailable");
        long now = System.currentTimeMillis();
        ZoneId zone = ZoneId.systemDefault();
        long start = Instant.ofEpochMilli(now).atZone(zone).toLocalDate().atStartOfDay(zone).toInstant().toEpochMilli();
        List<UsageStats> records = manager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, now);
        if (records == null) return new JSONObject().put("status", "unavailable");
        Map<String, String> labels = new HashMap<>();
        for (int i = 0; i < catalog.length(); i++) {
            JSONObject app = catalog.getJSONObject(i);
            if ("app".equals(app.optString("kind"))) labels.put(app.getString("id"), app.getString("name"));
        }
        Map<String, Long> durations = new HashMap<>();
        for (UsageStats usage : records) {
            String pkg = usage.getPackageName();
            long duration = usage.getTotalTimeInForeground();
            if (labels.containsKey(pkg) && usage.getLastTimeUsed() >= start && duration >= 60_000)
                durations.merge(pkg, Math.min(duration, now - start), Long::sum);
        }
        List<Map.Entry<String, Long>> sorted = new ArrayList<>(durations.entrySet());
        sorted.sort(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
            .thenComparing(Map.Entry.comparingByKey()));
        JSONArray apps = new JSONArray();
        for (Map.Entry<String, Long> item : sorted.subList(0, Math.min(12, sorted.size()))) {
            long minutes = Math.min(item.getValue(), now - start) / 60_000;
            if (minutes > 0)
                apps.put(new JSONObject().put("label", labels.get(item.getKey())).put("minutes", minutes));
        }
        return new JSONObject().put("status", "ready").put("apps", apps);
    }
}
