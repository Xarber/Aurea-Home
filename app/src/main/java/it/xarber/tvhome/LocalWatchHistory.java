// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/** Bounded local viewing records from explicitly enabled apps. */
final class LocalWatchHistory {
    private static final int MAX_RECORDS=60;
    private final HouseholdAccounts households;
    private final AndroidMediaSessions media;

    LocalWatchHistory(Context context,AndroidMediaSessions media){
        households=HouseholdAccounts.get(context);
        this.media=media;
    }

    JSONObject settings()throws Exception{
        SharedPreferences prefs=households.appearance();
        JSONArray previous=stored(prefs),records=new JSONArray();
        long now=System.currentTimeMillis();
        for(int i=0;i<previous.length();i++){
            JSONObject item=previous.optJSONObject(i);
            if(item!=null&&WatchHistoryPolicy.retain(item.optLong("observedAt",0),now))records.put(item);
        }
        if(records.length()!=previous.length())prefs.edit().putString("watch-history-records",records.toString()).apply();
        return new JSONObject().put("apps",new JSONArray(new java.util.TreeSet<>(sources(prefs)))).put("records",records);
    }

    JSONObject configure(String id,boolean enabled)throws Exception{
        SharedPreferences prefs=households.appearance();
        Set<String> allowed=new HashSet<>(sources(prefs));
        if(enabled){
            if(allowed.size()>=20&&!allowed.contains(id))throw new IllegalArgumentException("too_many_history_apps");
            allowed.add(id);
        }else allowed.remove(id);
        if(!prefs.edit().putStringSet("watch-history-apps",allowed).commit())throw new IllegalStateException("storage_failed");
        return settings();
    }

    JSONObject clear()throws Exception{
        if(!households.appearance().edit().remove("watch-history-records").remove("watch-history-apps").commit())
            throw new IllegalStateException("storage_failed");
        return settings();
    }

    void observe(){
        String profile=households.activeId();
        if(households.kids.active(profile))return;
        SharedPreferences prefs;
        try{prefs=households.layoutFor(profile);}catch(IllegalStateException changed){return;}
        if(sources(prefs).isEmpty())return;
        try{
            JSONArray sessions=media.read().getJSONArray("sessions");
            synchronized(households){
                if(!profile.equals(households.activeId())||households.kids.active(profile))return;
                Set<String> allowed=sources(prefs);
                if(allowed.isEmpty())return;
                long now=System.currentTimeMillis();
                JSONArray previous=stored(prefs),result=new JSONArray();
                Set<String> recorded=new HashSet<>();
                for(int i=0;i<sessions.length();i++){
                    JSONObject sample=sessions.getJSONObject(i);
                    String publisher=sample.getString("package");
                    long position=sample.optLong("position",-1),duration=sample.optLong("duration",-1);
                    if(!WatchHistoryPolicy.recordable(allowed.contains(publisher),sample.optBoolean("playing"),position,duration))
                        continue;
                    String title=sample.getString("title");
                    String id=publisher+":"+title;
                    if(!recorded.add(id))continue;
                    result.put(new JSONObject().put("app",publisher).put("title",title).put("position",position)
                        .put("duration",duration).put("observedAt",now));
                }
                if(result.length()==0)return;
                for(int i=0;i<previous.length()&&result.length()<MAX_RECORDS;i++){
                    JSONObject record=previous.optJSONObject(i);
                    if(record==null||!WatchHistoryPolicy.retain(record.optLong("observedAt",0),now))continue;
                    if(recorded.add(record.getString("app")+":"+record.getString("title")))result.put(record);
                }
                prefs.edit().putString("watch-history-records",result.toString()).apply();
            }
        }catch(Exception unavailable){/* A missing permission or app session must not alter retained history. */}
    }

    private static Set<String> sources(SharedPreferences prefs){
        return prefs.getStringSet("watch-history-apps",java.util.Collections.emptySet());
    }

    private static JSONArray stored(SharedPreferences prefs){
        try{return new JSONArray(prefs.getString("watch-history-records","[]"));}
        catch(org.json.JSONException invalid){return new JSONArray();}
    }
}
