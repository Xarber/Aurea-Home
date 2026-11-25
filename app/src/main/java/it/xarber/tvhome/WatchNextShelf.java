// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.media.tv.TvContract.WatchNextPrograms;
import android.net.Uri;
import android.os.SystemClock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/** Read-only Android TV Watch Next. Stream providers remain in control of playback state. */
final class WatchNextShelf {
    private static final String[] COLUMNS={"_id","package_name","title","episode_title","intent_uri",
        "last_engagement_time_utc_millis","last_playback_position_millis","duration_millis","watch_next_type"};
    private static final String STREMIO="com.stremio.one";
    private static final String[] PREVIEW_COLUMNS={"_id","package_name","title","episode_title","intent_uri",
        "last_playback_position_millis","duration_millis"};
    private static final int MAX_SCANNED=256,MAX_VISIBLE=32;
    private final Context context;
    private final SharedPreferences prefs;
    private final Map<String,Program> programs=new LinkedHashMap<>();
    private long validUntil;

    WatchNextShelf(Context context){
        this.context=context;
        prefs=context.getSharedPreferences("watch-next-shelf",Context.MODE_PRIVATE);
    }

    synchronized JSONObject read()throws Exception{
        programs.clear();
        ArrayList<Program> rows=new ArrayList<>();
        boolean available=false;
        try(Cursor cursor=context.getContentResolver().query(WatchNextPrograms.CONTENT_URI,COLUMNS,null,null,
                "last_engagement_time_utc_millis DESC")){
            if(cursor!=null){
            available=true;
            int scanned=0;
            while(scanned++<MAX_SCANNED&&cursor.moveToNext()){
                if(cursor.getInt(8)!=WatchNextPrograms.WATCH_NEXT_TYPE_CONTINUE&&
                    cursor.getInt(8)!=WatchNextPrograms.WATCH_NEXT_TYPE_NEXT)continue;
                String id=cursor.getString(0),publisher=cursor.getString(1),title=cursor.getString(2);
                if(id==null||!id.matches("[0-9]{1,19}")||publisher==null||!publisher.matches("[A-Za-z0-9_.]{3,240}")||
                    title==null||title.trim().isEmpty())continue;
                long engagement=cursor.getLong(5);
                String key=publisher+":"+id;
                if(prefs.contains(key)&&prefs.getLong(key,0)>=engagement)continue;
                Intent intent=target(publisher,cursor.getString(4));
                if(intent==null)continue;
                JSONObject entry=new JSONObject().put("id",key).put("title",display(title,160))
                    .put("episode",display(cursor.getString(3),160)).put("source",label(publisher)).put("publisher",publisher);
                long position=cursor.getLong(6),duration=cursor.getLong(7);
                if(!cursor.isNull(6)&&!cursor.isNull(7)&&duration>0&&position>=0&&position<=duration)
                    entry.put("positionMs",position).put("durationMs",duration);
                rows.add(new Program(key,engagement,intent,entry));
                if(rows.size()>=MAX_VISIBLE)break;
            }}
        }catch(IllegalArgumentException|SecurityException unsupported){
            /* Some Android TV builds only expose preview rows. */
        }
        if(rows.size()<MAX_VISIBLE)available=addStremio(rows)||available;
        rows.sort(Comparator.comparingLong((Program item)->item.id.startsWith("preview:")?0:item.engagement).reversed());
        JSONArray visible=new JSONArray();
        for(Program program:rows){programs.put(program.id,program);visible.put(program.entry);}
        validUntil=SystemClock.elapsedRealtime()+5*60*1000;
        return new JSONObject().put("available",available).put("entries",visible);
    }

    private boolean addStremio(ArrayList<Program> rows)throws Exception{
        if(context.getPackageManager().getLeanbackLaunchIntentForPackage(STREMIO)==null)return false;
        try(Cursor cursor=context.getContentResolver().query(android.media.tv.TvContract.PreviewPrograms.CONTENT_URI,
                PREVIEW_COLUMNS,"package_name=?",new String[]{STREMIO},"_id DESC")){
            if(cursor==null)return false;
            int scanned=0;
            while(rows.size()<MAX_VISIBLE&&scanned++<MAX_SCANNED&&cursor.moveToNext()){
                if(!STREMIO.equals(cursor.getString(1)))continue;
                long position=cursor.getLong(5),duration=cursor.getLong(6);
                if(position<=0||duration<=position)continue;
                String id=cursor.getString(0),title=display(cursor.getString(2),160);
                if(id==null||!id.matches("[0-9]{1,19}")||title.isEmpty())continue;
                Intent open=target(STREMIO,cursor.getString(4));
                if(open==null)continue;
                String key="preview:"+STREMIO+":"+id;
                if(prefs.contains(key)&&prefs.getLong(key,0)>=position)continue;
                JSONObject entry=new JSONObject().put("id",key).put("title",title)
                    .put("episode",display(cursor.getString(3),160)).put("source","Stremio").put("publisher",STREMIO)
                    .put("positionMs",position).put("durationMs",duration);
                rows.add(new Program(key,position,open,entry));
            }
            return true;
        }catch(IllegalArgumentException|SecurityException unsupported){return false;}
    }

    private String label(String publisher){
        try {
            android.content.pm.PackageManager pm=context.getPackageManager();
            return display(String.valueOf(pm.getApplicationLabel(pm.getApplicationInfo(publisher,0))),100);
        }catch(android.content.pm.PackageManager.NameNotFoundException missing){return publisher;}
    }

    private static String display(String value,int limit){
        if(value==null)return "";
        String safe=value.replaceAll("[\\p{Cc}\\p{Cf}]"," ").trim();
        return safe.substring(0,Math.min(safe.length(),limit));
    }

    private Intent target(String publisher,String value){
        if(value==null||value.length()>2048)return null;
        try {
            Intent raw=Intent.parseUri(value,Intent.URI_INTENT_SCHEME);
            if(!Intent.ACTION_VIEW.equals(raw.getAction())||raw.getSelector()!=null)return null;
            Uri data=raw.getData();
            String scheme=data==null?null:data.getScheme();
            if(scheme==null||!scheme.matches("[A-Za-z][A-Za-z0-9+.-]{1,30}")||
                java.util.Arrays.asList("file","content","intent","javascript","android.resource","data").contains(scheme.toLowerCase(java.util.Locale.ROOT)))return null;
            Intent safe=new Intent(Intent.ACTION_VIEW,data).setPackage(publisher).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            return safe.resolveActivity(context.getPackageManager())==null?null:safe;
        }catch(java.net.URISyntaxException|IllegalArgumentException invalid){return null;}
    }

    synchronized JSONObject matching(String title,String selectedId)throws Exception{
        return matching(title,selectedId,()->true);
    }
    synchronized JSONObject matching(String title,String selectedId,java.util.function.BooleanSupplier allowed)throws Exception{
        read();
        JSONArray matches=new JSONArray();
        for(Program program:programs.values()){
            String name=program.entry.getString("title"),episode=program.entry.getString("episode");
            if(!WatchTitle.matches(title,name)&&
                (episode.isEmpty()||!WatchTitle.matches(title,name+" · "+episode)))continue;
            if(program.id.equals(selectedId)){
                if(!allowed.getAsBoolean())throw new IllegalStateException("watch_start_canceled");
                return action(selectedId,false);
            }
            matches.put(program.entry);
        }
        if(!selectedId.isEmpty())throw new IllegalArgumentException("unknown_program");
        return new JSONObject().put("entries",matches);
    }

    synchronized JSONObject action(String id,boolean dismiss)throws Exception{
        if(SystemClock.elapsedRealtime()>validUntil)read();
        Program program=programs.get(id);
        if(program==null)throw new IllegalArgumentException("unknown_program");
        if(dismiss){
            SharedPreferences.Editor edit=prefs.edit();
            Map<String,?> stored=prefs.getAll();
            if(stored.size()>=128){
                stored.entrySet().stream().filter(item->item.getValue() instanceof Long)
                    .min(Comparator.comparingLong(item->(Long)item.getValue())).ifPresent(item->edit.remove(item.getKey()));
            }
            if(!edit.putLong(id,program.engagement).commit())throw new IllegalStateException("storage_failed");
            return read();
        }
        context.startActivity(program.intent);
        return new JSONObject().put("accepted",true);
    }

    private static final class Program {
        final String id; final long engagement; final Intent intent; final JSONObject entry;
        Program(String id,long engagement,Intent intent,JSONObject entry){this.id=id;this.engagement=engagement;this.intent=intent;this.entry=entry;}
    }
}
