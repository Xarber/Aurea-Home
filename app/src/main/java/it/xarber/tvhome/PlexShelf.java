// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import android.content.Intent;
import it.xarber.tvhome.playback.PairingStore;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.util.HashSet;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONArray;
import org.json.JSONObject;

/** Opt-in, read-only Plex server integration. Credentials never enter the JS snapshot. */
final class PlexShelf {
    private static final int MAX_BYTES=524288,MAX_TITLES=20;
    private final Context context;
    PlexShelf(Context context){this.context=context;}

    private PairingStore store(String profile){
        if(profile.equals("home"))return new PairingStore(context,"plex-home");
        String hex=java.util.UUID.fromString(profile).toString().replace("-","");
        StringBuilder namespace=new StringBuilder("plex-");
        for(int i=0;i<hex.length();i++)namespace.append((char)('a'+Character.digit(hex.charAt(i),16)));
        return new PairingStore(context,namespace.toString());
    }

    JSONObject status(String profile)throws Exception{
        return new JSONObject().put("connected",store(profile).read()!=null);
    }

    JSONObject connect(String profile,String server,String token)throws Exception{
        URI origin=new URI(server.trim());
        String path=origin.getRawPath();
        if(!"https".equalsIgnoreCase(origin.getScheme())||origin.getHost()==null||origin.getPort()==0||
            origin.getRawUserInfo()!=null||origin.getRawQuery()!=null||origin.getRawFragment()!=null||
            path!=null&&!path.isEmpty()&&!path.equals("/")||!token.matches("[A-Za-z0-9_-]{8,256}"))
            throw new IllegalArgumentException("invalid_plex_configuration");
        URI authorized=new URI("https",null,origin.getHost(),origin.getPort(),null,null,null);
        JSONArray titles=fetchTitles(authorized,token);
        store(profile).save(new JSONObject().put("credentials",token).put("identifier",authorized.toString()).put("name","Plex"));
        return new JSONObject().put("connected",true).put("entries",titles);
    }

    JSONObject list(String profile)throws Exception{
        JSONObject saved=store(profile).read();
        if(saved==null)return new JSONObject().put("connected",false);
        return new JSONObject().put("connected",true).put("entries",
            fetchTitles(new URI(saved.getString("identifier")),saved.getString("credentials")));
    }

    JSONObject disconnect(String profile)throws Exception{
        store(profile).clear();
        return status(profile);
    }

    void openApp() {
        android.content.pm.PackageManager pm=context.getPackageManager();
        Intent intent=pm.getLeanbackLaunchIntentForPackage("com.plexapp.android");
        if(intent==null)intent=pm.getLaunchIntentForPackage("com.plexapp.android");
        if(intent==null)throw new IllegalStateException("plex_app_missing");
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    private static JSONArray fetchTitles(URI server,String token)throws Exception{
        HttpsURLConnection connection=(HttpsURLConnection)server.resolve("/hubs/continueWatching?count=20").toURL().openConnection();
        connection.setConnectTimeout(3500);
        connection.setReadTimeout(3500);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Accept","application/json");
        connection.setRequestProperty("X-Plex-Token",token);
        connection.setRequestProperty("X-Plex-Product","Aurea Home");
        try {
            if(connection.getResponseCode()!=200)throw new IllegalStateException("plex_unavailable");
            try(InputStream input=connection.getInputStream();ByteArrayOutputStream output=new ByteArrayOutputStream()){
                byte[] buffer=new byte[4096];
                long deadline=android.os.SystemClock.elapsedRealtime()+4500;
                int count;
                while((count=input.read(buffer))!=-1){
                    if(output.size()+count>MAX_BYTES||android.os.SystemClock.elapsedRealtime()>deadline)
                        throw new IllegalStateException("plex_response_limit");
                    output.write(buffer,0,count);
                }
                return parse(new JSONObject(output.toString("UTF-8")));
            }
        }finally{connection.disconnect();}
    }

    private static JSONArray parse(JSONObject payload)throws Exception{
        JSONObject container=payload.getJSONObject("MediaContainer");
        JSONArray result=new JSONArray();
        HashSet<String> seen=new HashSet<>();
        append(container.optJSONArray("Metadata"),result,seen);
        JSONArray hubs=container.optJSONArray("Hub");
        if(hubs!=null)for(int i=0;i<Math.min(hubs.length(),32);i++){
            JSONObject hub=hubs.optJSONObject(i);
            if(hub!=null&&"home.continue".equals(hub.optString("hubIdentifier")))append(hub.optJSONArray("Metadata"),result,seen);
        }
        return result;
    }

    private static void append(JSONArray records,JSONArray result,HashSet<String> seen)throws Exception{
        if(records==null)return;
        for(int i=0;i<Math.min(records.length(),128)&&result.length()<MAX_TITLES;i++){
            JSONObject item=records.optJSONObject(i);
            if(item==null)continue;
            String id=item.optString("ratingKey"),kind=item.optString("type"),title=label(item.optString("title"));
            if(!id.matches("[0-9]{1,20}")||title.isEmpty()||!kind.equals("movie")&&!kind.equals("episode")||!seen.add(id))continue;
            JSONObject row=new JSONObject().put("id",id).put("title",title).put("show",label(item.optString("grandparentTitle")));
            long position=item.optLong("viewOffset",-1),duration=item.optLong("duration",-1);
            if(position>=0&&duration>0&&position<=duration)row.put("positionMs",position).put("durationMs",duration);
            result.put(row);
        }
    }

    private static String label(String raw){
        String text=raw.replaceAll("[\\p{Cc}\\p{Cf}]"," ").trim();
        return text.substring(0,Math.min(text.length(),160));
    }
}
