// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.SharedPreferences;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

/** Local, per-profile library folders. Changing a folder never alters installed apps. */
final class ProfileFolders {
    private static final String KEY="library-folders";
    private static final int MAX_FOLDERS=12,MAX_APPS=24;

    static JSONArray read(SharedPreferences preferences)throws Exception {
        return new JSONArray(preferences.getString(KEY,"[]"));
    }

    static void change(SharedPreferences preferences,TVHomeCatalog catalog,JSONObject request)throws Exception {
        JSONArray folders=read(preferences);
        String action=request.getString("action");
        if(action.equals("create")){
            if(folders.length()>=MAX_FOLDERS)throw new IllegalStateException("folder_limit");
            String name=cleanName(request.getString("name"));
            checkDuplicate(folders,name,"");
            folders.put(new JSONObject().put("id",UUID.randomUUID().toString()).put("name",name).put("apps",new JSONArray()));
        }else{
            String id=request.getString("id");
            int index=find(folders,id);
            JSONObject folder=folders.getJSONObject(index);
            switch(action){
                case "delete":folders.remove(index);break;
                case "rename":
                    String name=cleanName(request.getString("name"));
                    checkDuplicate(folders,name,id);
                    folder.put("name",name);break;
                case "add":
                case "remove":
                    String app=request.getString("app");
                    JSONArray apps=folder.getJSONArray("apps");
                    int existing=-1;
                    for(int i=0;i<apps.length();i++)if(app.equals(apps.optString(i)))existing=i;
                    if(action.equals("remove")){if(existing>=0)apps.remove(existing);}
                    else if(existing<0){
                        if(apps.length()>=MAX_APPS||!catalog.isApp(app))throw new IllegalArgumentException("invalid_folder_app");
                        apps.put(app);
                    }
                    break;
                default:throw new IllegalArgumentException("unknown_folder_action");
            }
        }
        if(!preferences.edit().putString(KEY,folders.toString()).commit())throw new IllegalStateException("storage_failed");
    }

    private static String cleanName(String original){
        String value=original.trim();
        if(value.isEmpty()||value.length()>40||value.matches("(?s).*[\\p{Cc}\\p{Cf}].*"))
            throw new IllegalArgumentException("invalid_folder_name");
        return value;
    }

    private static int find(JSONArray folders,String id)throws Exception {
        for(int i=0;i<folders.length();i++)if(id.equals(folders.getJSONObject(i).getString("id")))return i;
        throw new IllegalArgumentException("unknown_folder");
    }

    private static void checkDuplicate(JSONArray folders,String name,String except)throws Exception {
        for(int i=0;i<folders.length();i++){
            JSONObject row=folders.getJSONObject(i);
            if(!except.equals(row.getString("id"))&&name.equalsIgnoreCase(row.getString("name")))
                throw new IllegalArgumentException("duplicate_folder_name");
        }
    }
}
