// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.SharedPreferences;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

final class ViewingExports {
    private static final String STORE="imported-viewing-history";
    private static final int MAX_BYTES=4*1024*1024,MAX_RECORDS=120;
    private static final java.util.regex.Pattern YOUTUBE_VIDEO=java.util.regex.Pattern.compile(
        "^https://(?:www\\.|music\\.)?youtube\\.com/watch\\?v=([A-Za-z0-9_-]{11})(?:&[^#]*)?$");
    static JSONArray read(SharedPreferences preferences)throws Exception {
        return new JSONArray(preferences.getString(STORE,"[]"));
    }

    static List<JSONObject> parse(InputStream input,String netflixProfile)throws Exception{
        if(input==null)throw new IOException("history_file_unavailable");
        ByteArrayOutputStream data=new ByteArrayOutputStream();
        byte[] buffer=new byte[16384];
        int count;
        while((count=input.read(buffer))!=-1){
            if(data.size()+count>MAX_BYTES)throw new IOException("history_file_too_large");
            data.write(buffer,0,count);
        }
        String document=data.toString("UTF-8").replaceFirst("^\ufeff","").trim();
        List<JSONObject> rows;
        if(document.startsWith("["))rows=youtube(document);
        else if(document.startsWith("<"))rows=youtubeHtml(document);
        else rows=netflix(document,netflixProfile);
        if(rows.isEmpty())throw new IOException("history_no_entries");
        return rows;
    }

    private static List<JSONObject> netflix(String document,String profile)throws Exception {
        List<JSONObject> output=new ArrayList<>();
        NetflixExport.read(document,profile,(title,time,dateOnly)->append(output,"Netflix",title,"",time,dateOnly));
        return output;
    }

    private static List<JSONObject> youtube(String document)throws Exception {
        List<JSONObject> output=new ArrayList<>();
        JSONArray items=new JSONArray(document);
        for(int i=0;i<items.length();i++){
            JSONObject item=items.optJSONObject(i);
            if(item==null)continue;
            String url=item.optString("titleUrl");
            java.util.regex.Matcher video=YOUTUBE_VIDEO.matcher(url);
            if(!video.matches())continue;
            try{
                long time=Instant.parse(item.getString("time")).toEpochMilli();
                String product=url.startsWith("https://music.")?"YouTube Music":"YouTube";
                append(output,product,item.optString("title").replaceFirst("(?i)^watched ",""),video.group(1),time,false);
            }catch(java.time.DateTimeException|org.json.JSONException ignored){}
        }
        return output;
    }

    private static List<JSONObject> youtubeHtml(String document)throws Exception{
        // Convert HTML to text and link spans without loading or rendering any resource.
        android.text.Spanned text=android.text.Html.fromHtml(document,android.text.Html.FROM_HTML_MODE_LEGACY);
        List<JSONObject> output=new ArrayList<>();
        android.text.style.URLSpan[] links=text.getSpans(0,text.length(),android.text.style.URLSpan.class);
        java.util.Arrays.sort(links,Comparator.comparingInt(text::getSpanStart));
        for(int i=0;i<links.length;i++){
            android.text.style.URLSpan link=links[i];
            String url=link.getURL();
            java.util.regex.Matcher video=YOUTUBE_VIDEO.matcher(url);
            int start=text.getSpanStart(link),end=text.getSpanEnd(link);
            if(!video.matches()||start<0||end<=start||end-start>4096)continue;
            int left=Math.max(0,start-24);
            String prefix=text.subSequence(left,start).toString();
            if(!prefix.matches("(?s).*(?:^|\\s)(?i:watched)\\s+"))continue;
            int limit=Math.min(text.length(),end+512);
            // A channel link can follow the title. Stop before the next watched record.
            String trailing=text.subSequence(end,limit).toString();
            String[] lines=trailing.split("\\R",8);
            for(String line:lines){
                if(line.trim().matches("(?i)^watched\\b.*"))break;
                Long time=YouTubeTakeoutTime.parse(line);
                if(time==null)continue;
                String service=url.startsWith("https://music.")?"YouTube Music":"YouTube";
                append(output,service,text.subSequence(start,end).toString(),video.group(1),time,false);
                break;
            }
        }
        return output;
    }

    private static void append(List<JSONObject> rows,String service,String name,String video,long time,boolean dateOnly)throws Exception {
        String title=name.replaceAll("[\\p{Cc}\\p{Cf}]"," ").trim();
        if(title.isEmpty()||time<=0||time>System.currentTimeMillis()+86400000)return;
        if(rows.size()>=400){
            rows.sort(Comparator.comparingLong((JSONObject entry)->entry.optLong("watched")).reversed());
            rows.subList(MAX_RECORDS,rows.size()).clear();
        }
        rows.add(new JSONObject().put("service",service).put("title",title.substring(0,Math.min(160,title.length())))
            .put("video",video).put("watched",time).put("dateOnly",dateOnly));
    }

    static int merge(SharedPreferences preferences,List<JSONObject> imported)throws Exception {
        List<JSONObject> all=new ArrayList<>(imported);
        JSONArray previous=read(preferences);
        for(int i=0;i<previous.length();i++)all.add(previous.getJSONObject(i));
        all.sort(Comparator.comparingLong((JSONObject entry)->entry.optLong("watched")).reversed());
        JSONArray result=new JSONArray();
        HashSet<String> keys=new HashSet<>();
        for(JSONObject row:all){
            String key=row.optString("service")+"\n"+row.optString("title")+"\n"+row.optString("video")+"\n"+row.optLong("watched");
            if(keys.add(key))result.put(row);
            if(result.length()>=MAX_RECORDS)break;
        }
        if(!preferences.edit().putString(STORE,result.toString()).commit())throw new IOException("history_storage_failed");
        return result.length();
    }

    static void clear(SharedPreferences preferences)throws IOException{
        if(!preferences.edit().remove(STORE).commit())throw new IOException("history_storage_failed");
    }
}
