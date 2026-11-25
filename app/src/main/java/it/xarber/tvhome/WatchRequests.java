// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.SharedPreferences;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

/** Requests remain in the active TV profile and are never exposed to other remotes. */
final class WatchRequests {
    private static final String LIST="watch-requests",ENABLED="watch-requests-enabled";
    private WatchRequests(){}

    static JSONObject state(SharedPreferences preferences)throws Exception{
        return new JSONObject().put("enabled",enabled(preferences)).put("requests",rows(preferences));
    }

    static boolean enabled(SharedPreferences preferences){return preferences.getBoolean(ENABLED,false);}

    static void enable(SharedPreferences preferences,boolean enabled){
        if(!preferences.edit().putBoolean(ENABLED,enabled).commit())throw new IllegalStateException("storage_failed");
    }

    static JSONObject submit(SharedPreferences preferences,String input)throws Exception {
        if(!enabled(preferences))return SystemRemoteController.error("watch_requests_disabled");
        String title=input.trim();
        if(title.length()<2||title.length()>120||title.matches("(?s).*[\\p{Cc}\\p{Cf}].*"))
            return SystemRemoteController.error("invalid_watch_request");
        JSONArray records=rows(preferences);
        for(int i=0;i<records.length();i++)if(title.equalsIgnoreCase(records.getJSONObject(i).getString("title")))
            return new JSONObject().put("accepted",true);
        if(records.length()>=40)return SystemRemoteController.error("watch_requests_full");
        records.put(new JSONObject().put("id",UUID.randomUUID().toString()).put("title",title)
            .put("requested",System.currentTimeMillis()));
        save(preferences,records);
        return new JSONObject().put("accepted",true);
    }

    static String title(SharedPreferences preferences,String id)throws Exception {
        JSONArray records=rows(preferences);
        for(int i=0;i<records.length();i++){
            JSONObject record=records.getJSONObject(i);
            if(id.equals(record.getString("id")))return record.getString("title");
        }
        throw new IllegalArgumentException("unknown_watch_request");
    }

    static void dismiss(SharedPreferences preferences,String id)throws Exception {
        JSONArray records=rows(preferences);
        for(int i=0;i<records.length();i++)if(records.getJSONObject(i).getString("id").equals(id)){
            records.remove(i);save(preferences,records);return;
        }
    }

    private static JSONArray rows(SharedPreferences preferences)throws Exception {
        return new JSONArray(preferences.getString(LIST,"[]"));
    }

    private static void save(SharedPreferences preferences,JSONArray rows){
        if(!preferences.edit().putString(LIST,rows.toString()).commit())throw new IllegalStateException("storage_failed");
    }
}
