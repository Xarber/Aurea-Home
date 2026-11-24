// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.SharedPreferences;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.HashSet;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/** Portable library layout. Hardware mappings, identity, and history are outside the schema. */
final class ProfileLayout {
    private static final int MAX_FILE=65536;
    private static final String PREVIOUS="previous-library-layout";

    static JSONObject describe(SharedPreferences preferences)throws Exception {
        return new JSONObject().put("kind","aurea-library-layout").put("schema",1)
            .put("first",preferences.getString("input-dock-pin","inputs"))
            .put("dock",new JSONArray(preferences.getString("dock-pins","[]")))
            .put("hidden",new JSONArray(preferences.getStringSet("hidden-apps",java.util.Collections.emptySet())))
            .put("folders",ProfileFolders.read(preferences))
            .put("start",preferences.getString("start-focus","dock"));
    }

    static JSONObject read(InputStream input)throws Exception {
        if(input==null)throw new IllegalArgumentException("missing_layout");
        ByteArrayOutputStream output=new ByteArrayOutputStream();
        byte[] bytes=new byte[4096];
        int count;
        while((count=input.read(bytes))!=-1){
            if(output.size()+count>MAX_FILE)throw new IllegalArgumentException("layout_too_large");
            output.write(bytes,0,count);
        }
        JSONObject saved=new JSONObject(output.toString("UTF-8"));
        validate(saved);
        return saved;
    }

    private static boolean validId(Object value) {
        return value instanceof String&&((String)value).matches("[A-Za-z0-9_./:$;-]{1,250}");
    }

    private static void validate(JSONObject data)throws Exception {
        if(!"aurea-library-layout".equals(data.getString("kind"))||data.getInt("schema")!=1||
           !validId(data.get("first"))||data.getString("first").equals("all")||data.getString("first").equals("library")||
           !java.util.Arrays.asList("dock","inputs","apps").contains(data.getString("start")))
            throw new IllegalArgumentException("invalid_layout");
        JSONArray dock=data.getJSONArray("dock");
        if(dock.length()>5)throw new IllegalArgumentException("invalid_dock");
        HashSet<String> pinned=new HashSet<>();
        pinned.add(data.getString("first"));
        for(int i=0;i<dock.length();i++){
            String id=dock.getString(i);
            if(!validId(id)||i<4&&(id.equals("all")||id.equals("library"))||!pinned.add(id))
                throw new IllegalArgumentException("invalid_dock");
        }
        idSet(data.getJSONArray("hidden"),256);
        JSONArray folders=data.getJSONArray("folders");
        if(folders.length()>12)throw new IllegalArgumentException("invalid_folders");
        HashSet<String> ids=new HashSet<>(),names=new HashSet<>();
        for(int i=0;i<folders.length();i++){
            JSONObject folder=folders.getJSONObject(i);
            String id=folder.getString("id"),name=folder.getString("name").trim();
            if(!id.matches("[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}")||!ids.add(id)||
                name.isEmpty()||name.length()>40||name.matches("(?s).*[\\p{Cc}\\p{Cf}].*")||
                !names.add(name.toLowerCase(Locale.ROOT)))throw new IllegalArgumentException("invalid_folder");
            idSet(folder.getJSONArray("apps"),24);
        }
    }

    private static HashSet<String> idSet(JSONArray values,int limit)throws Exception {
        if(values.length()>limit)throw new IllegalArgumentException("too_many_items");
        HashSet<String> ids=new HashSet<>();
        for(int i=0;i<values.length();i++){
            Object id=values.get(i);
            if(!validId(id)||!ids.add((String)id))throw new IllegalArgumentException("invalid_item");
        }
        return ids;
    }

    static void restore(SharedPreferences preferences,JSONObject data)throws Exception {
        validate(data);
        JSONArray folders=data.getJSONArray("folders"),sanitized=new JSONArray();
        for(int i=0;i<folders.length();i++){
            JSONObject folder=folders.getJSONObject(i);
            sanitized.put(new JSONObject().put("id",folder.getString("id")).put("name",folder.getString("name").trim())
                .put("apps",folder.getJSONArray("apps")));
        }
        if(!preferences.edit().putString(PREVIOUS,describe(preferences).toString())
            .putString("input-dock-pin",data.getString("first")).putString("dock-pins",data.getJSONArray("dock").toString())
            .putStringSet("hidden-apps",idSet(data.getJSONArray("hidden"),256)).putString("library-folders",sanitized.toString())
            .putString("start-focus",data.getString("start")).commit())throw new IllegalStateException("storage_failed");
    }
    static boolean canUndo(SharedPreferences preferences){return preferences.contains(PREVIOUS);}
    static void undo(SharedPreferences preferences)throws Exception {
        restore(preferences,new JSONObject(preferences.getString(PREVIOUS,"{}")));
    }
}
