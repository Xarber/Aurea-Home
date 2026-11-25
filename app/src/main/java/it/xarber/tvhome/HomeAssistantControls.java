// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import it.xarber.tvhome.playback.PairingStore;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONArray;
import org.json.JSONObject;

/** Outbound, user-configured connection. The local TV remote has no access to this token. */
final class HomeAssistantControls {
    private final PairingStore store;

    HomeAssistantControls(Context context){store=new PairingStore(context,"home-assistant-control");}

    JSONObject status()throws Exception {
        JSONObject entry=store.read();
        return new JSONObject().put("connected",entry!=null)
            .put("entities",entry==null?new JSONArray():new JSONArray(entry.optString("companion","[]")));
    }

    JSONObject connect(String address,String token)throws Exception {
        URI raw=new URI(address.trim());
        String path=raw.getRawPath();
        if(!"https".equalsIgnoreCase(raw.getScheme())||raw.getHost()==null||raw.getPort()==0||
            raw.getRawUserInfo()!=null||raw.getRawQuery()!=null||raw.getRawFragment()!=null||
            path!=null&&!path.isEmpty()&&!path.equals("/")||!token.matches("[A-Za-z0-9._-]{16,4096}"))
            throw new IllegalArgumentException("invalid_home_assistant_connection");
        URI base=new URI("https",null,raw.getHost(),raw.getPort(),null,null,null);
        JSONObject next=new JSONObject().put("credentials",token).put("identifier",base.toString()).put("name","Home Assistant");
        get(next,"/api/");
        store.save(next);
        return status();
    }

    JSONObject disconnect()throws Exception {
        store.clear();
        return status();
    }

    JSONObject changeEntity(String id,boolean add)throws Exception {
        if(!id.matches("(light|switch|scene|climate|sensor|binary_sensor|camera)\\.[a-z0-9_]{1,120}"))
            throw new IllegalArgumentException("invalid_home_entity");
        JSONObject entry=required();
        JSONArray items=new JSONArray(entry.optString("companion","[]"));
        JSONArray next=new JSONArray();
        boolean already=false;
        for(int i=0;i<items.length();i++){
            String item=items.getString(i);
            if(item.equals(id)){already=true;if(!add)continue;}
            next.put(item);
        }
        if(add&&!already){
            if(items.length()>=8)throw new IllegalArgumentException("too_many_devices");
            get(entry,"/api/states/"+id);
            next.put(id);
        }
        entry.put("companion",next.toString());
        store.save(entry);
        return status();
    }

    JSONObject state(String id)throws Exception {
        JSONObject result=get(authorized(id),"/api/states/"+id);
        JSONObject attrs=result.optJSONObject("attributes");
        JSONObject visible=new JSONObject().put("state",bounded(result.optString("state","unavailable"),90))
            .put("name",bounded(attrs==null?id:attrs.optString("friendly_name",id),96));
        if(attrs!=null){
            visible.put("unit",bounded(attrs.optString("unit_of_measurement"),20));
            if(id.startsWith("climate.")){
                visible.put("current",attrs.opt("current_temperature"));
                visible.put("target",attrs.opt("temperature"));
                visible.put("min",attrs.opt("min_temp"));
                visible.put("max",attrs.opt("max_temp"));
                visible.put("step",attrs.opt("target_temp_step"));
            }
        }
        return visible;
    }

    JSONObject camera(String id)throws Exception{
        if(!id.startsWith("camera."))throw new IllegalArgumentException("unknown_camera");
        byte[] bytes=exchange(authorized(id),"/api/camera_proxy/"+id+"?width=960&height=540",null,"image/*",1024*1024);
        android.graphics.BitmapFactory.Options decode=new android.graphics.BitmapFactory.Options();
        decode.inJustDecodeBounds=true;
        android.graphics.BitmapFactory.decodeByteArray(bytes,0,bytes.length,decode);
        int edge=Math.max(decode.outWidth,decode.outHeight);
        if(decode.outWidth<1||decode.outHeight<1||edge>12000)throw new IOException("invalid_camera_frame");
        decode.inJustDecodeBounds=false;
        decode.inSampleSize=1;
        while(edge/decode.inSampleSize>1200)decode.inSampleSize*=2;
        android.graphics.Bitmap image=android.graphics.BitmapFactory.decodeByteArray(bytes,0,bytes.length,decode);
        if(image==null)throw new IOException("invalid_camera_frame");
        try(ByteArrayOutputStream jpeg=new ByteArrayOutputStream()){
            if(!image.compress(android.graphics.Bitmap.CompressFormat.JPEG,80,jpeg))throw new IOException("camera_frame_encode");
            String body=android.util.Base64.encodeToString(jpeg.toByteArray(),android.util.Base64.NO_WRAP);
            return new JSONObject().put("image","data:image/jpeg;base64,"+body).put("receivedAt",System.currentTimeMillis());
        }finally{image.recycle();}
    }

    JSONObject command(JSONObject input)throws Exception {
        String id=input.getString("id");
        JSONObject entry=authorized(id);
        String kind=id.substring(0,id.indexOf('.')),action=input.getString("action");
        JSONObject body=new JSONObject().put("entity_id",id);
        switch(kind){
            case "scene":
                if(!action.equals("turn_on"))throw new IllegalArgumentException("invalid_home_action");
                break;
            case "light":case "switch":
                if(!action.equals("turn_on")&&!action.equals("turn_off"))throw new IllegalArgumentException("invalid_home_action");
                break;
            case "climate":
                if(!action.equals("set_temperature"))throw new IllegalArgumentException("invalid_home_action");
                double target=input.getDouble("value");
                JSONObject attrs=get(entry,"/api/states/"+id).getJSONObject("attributes");
                double min=attrs.optDouble("min_temp"),max=attrs.optDouble("max_temp");
                if(!Double.isFinite(target)||!Double.isFinite(min)||!Double.isFinite(max)||target<min||target>max)
                    throw new IllegalArgumentException("invalid_temperature");
                body.put("temperature",target);
                break;
            default:throw new IllegalArgumentException("invalid_home_action");
        }
        response(entry,"/api/services/"+kind+"/"+action,body);
        return state(id);
    }

    private JSONObject required()throws Exception {
        JSONObject entry=store.read();
        if(entry==null)throw new IllegalStateException("home_assistant_unavailable");
        return entry;
    }

    private JSONObject authorized(String id)throws Exception {
        JSONObject entry=required();
        JSONArray list=new JSONArray(entry.optString("companion","[]"));
        for(int i=0;i<list.length();i++)if(list.getString(i).equals(id))return entry;
        throw new IllegalArgumentException("unknown_home_entity");
    }

    private static String bounded(String raw,int maximum){
        String clean=raw.replaceAll("[\\p{Cc}\\p{Cf}]"," ").trim();
        return clean.substring(0,Math.min(clean.length(),maximum));
    }

    private static JSONObject get(JSONObject entry,String path)throws Exception{
        return new JSONObject(response(entry,path,null));
    }

    private static String response(JSONObject entry,String path,JSONObject body)throws Exception {
        return new String(exchange(entry,path,body,"application/json",131072),StandardCharsets.UTF_8);
    }

    private static byte[] exchange(JSONObject entry,String path,JSONObject body,String accept,int maximum)throws Exception {
        URI target=new URI(entry.getString("identifier")).resolve(path);
        HttpsURLConnection connection=(HttpsURLConnection)target.toURL().openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(3000);
        connection.setReadTimeout(3000);
        connection.setRequestProperty("Authorization","Bearer "+entry.getString("credentials"));
        connection.setRequestProperty("Accept",accept);
        try{
            if(body!=null){
                byte[] encoded=body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setRequestMethod("POST");
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type","application/json");
                connection.setFixedLengthStreamingMode(encoded.length);
                try(java.io.OutputStream output=connection.getOutputStream()){output.write(encoded);}
            }
            int status=connection.getResponseCode();
            if(status<200||status>=300)throw new IOException("home_assistant_request_failed");
            try(InputStream input=connection.getInputStream();ByteArrayOutputStream output=new ByteArrayOutputStream()){
                long deadline=android.os.SystemClock.elapsedRealtime()+5000;
                int count;
                byte[] bytes=new byte[2048];
                while((count=input.read(bytes))!=-1){
                    if(output.size()+count>maximum||android.os.SystemClock.elapsedRealtime()>deadline)throw new IOException("home_assistant_response_limit");
                    output.write(bytes,0,count);
                }
                return output.toByteArray();
            }
        }finally{connection.disconnect();}
    }
}
