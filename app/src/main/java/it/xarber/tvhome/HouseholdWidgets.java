// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.SharedPreferences;
import java.time.ZoneId;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

/** Small local widgets whose data is scoped to the active household profile. */
final class HouseholdWidgets {
    private static final String KEY="household-widgets";

    static JSONArray read(SharedPreferences preferences)throws Exception {
        return new JSONArray(preferences.getString(KEY,"[]"));
    }

    static void change(SharedPreferences preferences,JSONObject request)throws Exception {
        JSONArray widgets=read(preferences);
        String operation=request.getString("action");
        if(operation.equals("remove")){
            String id=request.getString("id");
            for(int i=0;i<widgets.length();i++)if(id.equals(widgets.getJSONObject(i).getString("id"))){
                widgets.remove(i);
                break;
            }
        }else{
            if(widgets.length()>=12)throw new IllegalArgumentException("widget_limit");
            String label=request.getString("label").trim();
            if(label.isEmpty()||label.length()>48||label.matches("(?s).*[\\p{Cc}\\p{Cf}].*"))
                throw new IllegalArgumentException("invalid_widget_label");
            JSONObject value=new JSONObject().put("id",UUID.randomUUID().toString()).put("label",label);
            if(operation.equals("clock")){
                String zone=request.getString("zone");
                if(zone.length()>80||!ZoneId.getAvailableZoneIds().contains(zone))throw new IllegalArgumentException("invalid_zone");
                value.put("type","clock").put("zone",zone);
            }else if(operation.equals("note")){
                String body=request.getString("body").trim();
                if(body.isEmpty()||body.length()>600||body.replace("\n","").matches("(?s).*[\\p{Cc}\\p{Cf}].*"))
                    throw new IllegalArgumentException("invalid_note");
                value.put("type","note").put("body",body);
            }else if(operation.equals("countdown")){
                java.time.LocalDate date=java.time.LocalDate.parse(request.getString("date"));
                if(date.isBefore(java.time.LocalDate.now())||date.isAfter(java.time.LocalDate.now().plusYears(20)))
                    throw new IllegalArgumentException("invalid_countdown_date");
                value.put("type","countdown").put("until",date.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli());
            }else if(operation.equals("timer")){
                int minutes=request.getInt("minutes");
                if(minutes<1||minutes>1440)throw new IllegalArgumentException("invalid_timer");
                value.put("type","timer").put("until",System.currentTimeMillis()+minutes*60000L);
            }else throw new IllegalArgumentException("unknown_widget_action");
            widgets.put(value);
        }
        if(!preferences.edit().putString(KEY,widgets.toString()).commit())throw new IllegalStateException("storage_failed");
    }
}
