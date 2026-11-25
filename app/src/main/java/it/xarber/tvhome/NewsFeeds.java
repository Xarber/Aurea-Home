// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.SharedPreferences;
import android.util.Xml;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONArray;
import org.json.JSONObject;
import org.xmlpull.v1.XmlPullParser;

/** User-selected RSS or Atom feed. Only plain headlines and validated HTTPS links reach the UI. */
final class NewsFeeds {
    private static final String KEY="headlines-feed";
    private NewsFeeds(){}

    static JSONObject state(SharedPreferences preferences)throws Exception {
        return new JSONObject().put("feed",preferences.getString(KEY,""));
    }

    static JSONObject save(SharedPreferences preferences,String value)throws Exception {
        String url=value.isEmpty()?"":url(value).toString();
        if(!preferences.edit().putString(KEY,url).commit())throw new IOException("feed_storage");
        return state(preferences);
    }

    private static URI url(String text)throws Exception {
        if(text.length()>1024)throw new IllegalArgumentException("invalid_feed");
        URI uri=new URI(text.trim());
        if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||
            uri.getRawUserInfo()!=null||uri.getRawFragment()!=null)throw new IllegalArgumentException("invalid_feed");
        return uri;
    }

    static JSONObject refresh(String address)throws Exception {
        URI source=url(address);
        HttpsURLConnection connection=(HttpsURLConnection)source.toURL().openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(3000);
        connection.setReadTimeout(3000);
        connection.setRequestProperty("Accept","application/rss+xml, application/atom+xml, application/xml, text/xml");
        try{
            if(connection.getResponseCode()!=200)throw new IOException("feed_unavailable");
            try(InputStream input=connection.getInputStream();ByteArrayOutputStream output=new ByteArrayOutputStream()){
                long deadline=android.os.SystemClock.elapsedRealtime()+5000;
                int count;
                byte[] bytes=new byte[4096];
                while((count=input.read(bytes))!=-1){
                    if(output.size()+count>524288||android.os.SystemClock.elapsedRealtime()>deadline)
                        throw new IOException("feed_response_limit");
                    output.write(bytes,0,count);
                }
                return new JSONObject().put("headlines",headlines(output.toByteArray(),source)).put("fetched",System.currentTimeMillis());
            }
        }finally{connection.disconnect();}
    }

    private static JSONArray headlines(byte[] bytes,URI source)throws Exception {
        JSONArray items=new JSONArray();
        XmlPullParser parser=Xml.newPullParser();
        parser.setFeature(XmlPullParser.FEATURE_PROCESS_NAMESPACES,true);
        parser.setFeature(XmlPullParser.FEATURE_PROCESS_DOCDECL,false);
        parser.setInput(new ByteArrayInputStream(bytes),null);
        int depth=-1,titleDepth=-1,linkDepth=-1;
        StringBuilder title=new StringBuilder(),link=new StringBuilder();
        int event;
        while((event=parser.nextToken())!=XmlPullParser.END_DOCUMENT&&items.length()<20){
            if(event==XmlPullParser.DOCDECL||parser.getDepth()>32)throw new IOException("invalid_feed_structure");
            if(event==XmlPullParser.START_TAG){
                String name=parser.getName();
                if(depth<0&&(name.equals("item")||name.equals("entry"))){
                    depth=parser.getDepth();
                    title.setLength(0);link.setLength(0);
                }else if(depth>=0&&parser.getDepth()==depth+1){
                    if(name.equals("title"))titleDepth=parser.getDepth();
                    if(name.equals("link")&&link.length()==0){
                        String href=parser.getAttributeValue(null,"href"),relation=parser.getAttributeValue(null,"rel");
                        if(href!=null&&(relation==null||relation.equals("alternate")))append(link,href,1024);
                        if(href==null)linkDepth=parser.getDepth();
                    }
                }
            }else if(event==XmlPullParser.TEXT||event==XmlPullParser.CDSECT||event==XmlPullParser.ENTITY_REF){
                if(titleDepth>=0)append(title,parser.getText(),200);
                if(linkDepth>=0)append(link,parser.getText(),1024);
            }else if(event==XmlPullParser.END_TAG){
                int end=parser.getDepth();
                if(end==titleDepth)titleDepth=-1;
                if(end==linkDepth)linkDepth=-1;
                if(end==depth){
                    String headline=title.toString().replaceAll("[\\p{Cc}\\p{Cf}]"," ").trim();
                    if(!headline.isEmpty()){
                        JSONObject row=new JSONObject().put("title",headline);
                        try{if(link.length()>0)row.put("url",url(source.resolve(link.toString().trim()).toString()).toString());}
                        catch(Exception invalid){/* The plain headline remains readable. */}
                        items.put(row);
                    }
                    depth=-1;
                }
            }
        }
        return items;
    }

    private static void append(StringBuilder buffer,String text,int limit){
        if(text!=null&&buffer.length()<limit)buffer.append(text,0,Math.min(limit-buffer.length(),text.length()));
    }
}
