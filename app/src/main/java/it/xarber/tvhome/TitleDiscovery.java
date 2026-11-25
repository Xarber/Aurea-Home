// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import it.xarber.tvhome.playback.PairingStore;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONArray;
import org.json.JSONObject;

final class TitleDiscovery {
    private final PairingStore store;

    TitleDiscovery(Context context){store=new PairingStore(context,"title-discovery");}

    JSONObject settings()throws Exception {
        JSONObject saved=store.read();
        return new JSONObject().put("configured",saved!=null).put("region",saved==null?"":saved.getString("identifier"));
    }

    JSONObject configure(String token,String region)throws Exception {
        if(!token.matches("[A-Za-z0-9._-]{24,4096}")||!region.matches("[A-Z]{2}")||
            !java.util.Arrays.asList(java.util.Locale.getISOCountries()).contains(region))
            throw new IllegalArgumentException("invalid_discovery_settings");
        request(token,"/configuration");
        store.save(new JSONObject().put("credentials",token).put("identifier",region).put("name","TMDB"));
        return settings();
    }

    JSONObject disconnect()throws Exception {
        store.clear();
        return settings();
    }

    JSONObject search(String query,boolean italian)throws Exception {
        query=query.trim();
        if(query.length()<2||query.length()>120)throw new IllegalArgumentException("invalid_discovery_query");
        JSONObject saved=required();
        String lang=italian?"it-IT":"en-US";
        JSONArray raw=request(saved.getString("credentials"),"/search/multi?include_adult=false&language="+lang+
            "&query="+java.net.URLEncoder.encode(query,"UTF-8")).optJSONArray("results");
        return titles(raw,null);
    }

    JSONObject related(String kind,int id,boolean italian)throws Exception {
        verifyTitle(kind,id);
        String language=italian?"it-IT":"en-US";
        JSONArray result=request(required().getString("credentials"),"/"+kind+"/"+id+"/recommendations?language="+language)
            .optJSONArray("results");
        return titles(result,kind);
    }

    void openStremio(Context context,String kind,int id)throws Exception {
        verifyTitle(kind,id);
        String imdb=request(required().getString("credentials"),"/"+kind+"/"+id+"/external_ids").optString("imdb_id");
        if(!imdb.matches("tt[0-9]{5,12}"))throw new IllegalArgumentException("stremio_metadata_unavailable");
        String path="stremio:///detail/"+(kind.equals("movie")?"movie":"series")+"/"+imdb;
        if(kind.equals("movie"))path+="/"+imdb;
        android.content.Intent intent=new android.content.Intent(android.content.Intent.ACTION_VIEW,android.net.Uri.parse(path))
            .setPackage("com.stremio.one").addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        if(intent.resolveActivity(context.getPackageManager())==null)throw new IllegalStateException("stremio_link_unavailable");
        context.startActivity(intent);
    }

    private static JSONObject titles(JSONArray raw,String fallbackKind)throws Exception {
        JSONArray visible=new JSONArray();
        if(raw!=null)for(int i=0;i<raw.length()&&visible.length()<15;i++){
            JSONObject title=raw.optJSONObject(i);
            if(title==null||title.optBoolean("adult"))continue;
            String kind=title.optString("media_type",fallbackKind==null?"":fallbackKind);
            int id=title.optInt("id");
            if(id<=0||!kind.equals("tv")&&!kind.equals("movie"))continue;
            String name=clean(title.optString(kind.equals("tv")?"name":"title"),140);
            if(name.isEmpty())continue;
            String year=title.optString(kind.equals("tv")?"first_air_date":"release_date");
            visible.put(new JSONObject().put("id",id).put("kind",kind).put("title",name)
                .put("year",year.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")?year.substring(0,4):""));
        }
        return new JSONObject().put("titles",visible);
    }

    JSONObject providers(String kind,int id)throws Exception {
        verifyTitle(kind,id);
        JSONObject saved=required();
        String region=saved.getString("identifier");
        JSONObject payload=request(saved.getString("credentials"),"/"+kind+"/"+id+"/watch/providers");
        JSONObject regions=payload.optJSONObject("results");
        JSONObject location=regions==null?null:regions.optJSONObject(region);
        JSONObject visible=new JSONObject();
        for(String category:new String[]{"flatrate","free","ads","rent","buy"}){
            JSONArray providers=location==null?null:location.optJSONArray(category);
            if(providers==null)continue;
            JSONArray names=new JSONArray();
            for(int i=0;i<providers.length()&&names.length()<20;i++){
                JSONObject value=providers.optJSONObject(i);
                if(value==null)continue;
                String name=clean(value.optString("provider_name"),64);
                if(!name.isEmpty())names.put(name);
            }
            if(names.length()>0)visible.put(category,names);
        }
        return new JSONObject().put("region",region).put("providers",visible)
            .put("details","https://www.themoviedb.org/"+kind+"/"+id+"/watch");
    }

    private static void verifyTitle(String kind,int id){
        if(id<1||!kind.equals("tv")&&!kind.equals("movie"))throw new IllegalArgumentException("unknown_discovery_title");
    }

    private JSONObject required()throws Exception {
        JSONObject saved=store.read();
        if(saved==null)throw new IllegalStateException("discovery_not_configured");
        return saved;
    }

    private static String clean(String value,int max){
        String text=value.replaceAll("[\\p{Cc}\\p{Cf}]"," ").trim();
        return text.substring(0,Math.min(text.length(),max));
    }

    private static JSONObject request(String token,String path)throws Exception {
        HttpsURLConnection connection=(HttpsURLConnection)new URL("https://api.themoviedb.org/3"+path).openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(3000);
        connection.setReadTimeout(3000);
        connection.setRequestProperty("Authorization","Bearer "+token);
        connection.setRequestProperty("Accept","application/json");
        try{
            if(connection.getResponseCode()!=200)throw new IOException("metadata_unavailable");
            try(InputStream input=connection.getInputStream();ByteArrayOutputStream output=new ByteArrayOutputStream()){
                long until=android.os.SystemClock.elapsedRealtime()+5000;
                byte[] bytes=new byte[4096];
                int count;
                while((count=input.read(bytes))!=-1){
                    if(output.size()+count>524288||android.os.SystemClock.elapsedRealtime()>until)
                        throw new IOException("metadata_response_limit");
                    output.write(bytes,0,count);
                }
                return new JSONObject(output.toString("UTF-8"));
            }
        }finally{connection.disconnect();}
    }
}
