// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.SharedPreferences;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

final class ViewingExports {
    private static final String STORE="imported-viewing-history";
    private static final int MAX_BYTES=4*1024*1024,MAX_RECORDS=120;
    private static final java.util.regex.Pattern YOUTUBE_VIDEO=java.util.regex.Pattern.compile(
        "^https://(?:www\\.|music\\.)?youtube\\.com/watch\\?v=([A-Za-z0-9_-]{11})(?:&[^#]*)?$");
    private static final DateTimeFormatter NETFLIX_DATE=DateTimeFormatter.ofPattern("M/d/uuuu",Locale.US)
        .withResolverStyle(java.time.format.ResolverStyle.STRICT);

    private static final DateTimeFormatter NETFLIX_SHORT_DATE=new java.time.format.DateTimeFormatterBuilder()
        .appendPattern("M/d/").appendValueReduced(java.time.temporal.ChronoField.YEAR,2,2,2000)
        .toFormatter(Locale.US).withResolverStyle(java.time.format.ResolverStyle.STRICT);

    static JSONArray read(SharedPreferences preferences)throws Exception {
        return new JSONArray(preferences.getString(STORE,"[]"));
    }

    static List<JSONObject> parse(InputStream input)throws Exception{
        if(input==null)throw new IOException("history_file_unavailable");
        ByteArrayOutputStream data=new ByteArrayOutputStream();
        byte[] buffer=new byte[16384];
        int count;
        while((count=input.read(buffer))!=-1){
            if(data.size()+count>MAX_BYTES)throw new IOException("history_file_too_large");
            data.write(buffer,0,count);
        }
        String document=data.toString("UTF-8").replaceFirst("^\ufeff","").trim();
        List<JSONObject> rows=document.startsWith("[")?youtube(document):netflix(document);
        if(rows.isEmpty())throw new IOException("history_no_entries");
        return rows;
    }

    private static List<JSONObject> netflix(String document)throws Exception {
        List<JSONObject> output=new ArrayList<>();
        ViewingExportCsv reader=new ViewingExportCsv(new StringReader(document));
        List<String> header=reader.row();
        if(header==null||header.size()!=2||!header.get(0).equalsIgnoreCase("Title")||!header.get(1).equalsIgnoreCase("Date"))
            throw new IOException("netflix_profile_csv_required");
        List<String> row;
        while((row=reader.row())!=null){
            if(row.size()!=2)continue;
            try{
                String date=row.get(1).trim();
                DateTimeFormatter format=date.length()-date.lastIndexOf('/')==3?NETFLIX_SHORT_DATE:NETFLIX_DATE;
                long time=LocalDate.parse(date,format).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli();
                append(output,"Netflix",row.get(0),"",time,true);
            }catch(java.time.DateTimeException ignored){}
        }
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
