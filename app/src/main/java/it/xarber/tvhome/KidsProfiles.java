// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import android.os.SystemClock;
import it.xarber.tvhome.playback.PairingStore;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.json.JSONArray;
import org.json.JSONObject;

/** Launcher-local parent code and a curated app list. The Android system remains independent. */
final class KidsProfiles {
    private final PairingStore store;
    private volatile JSONObject configuration;
    private int attempts;
    private long blockedUntil;

    KidsProfiles(Context context){
        store=new PairingStore(context,"kids-profile");
        try{
            JSONObject stored=store.read();
            if(stored!=null)configuration=new JSONObject(stored.getString("credentials"));
        }catch(Exception ignored){}
    }

    JSONObject status(){
        JSONObject state=configuration;
        if(state==null)return new JSONObject();
        try{return new JSONObject().put("profile",state.getString("profile")).put("apps",state.getJSONArray("apps"));}
        catch(org.json.JSONException invalid){return new JSONObject();}
    }

    boolean active(String profile){
        JSONObject state=configuration;
        return state!=null&&profile.equals(state.optString("profile"));
    }

    boolean allowed(String app){
        JSONObject state=configuration;
        if(state==null)return false;
        JSONArray apps=state.optJSONArray("apps");
        if(apps==null)return false;
        for(int i=0;i<apps.length();i++)if(app.equals(apps.optString(i)))return true;
        return false;
    }

    synchronized void configure(String profile,JSONArray apps,String oldCode,String newCode)throws Exception {
        if(profile.equals("home")||!newCode.matches("[0-9]{4,8}"))throw new IllegalArgumentException("invalid_kids_configuration");
        if(configuration!=null)verify(oldCode);
        byte[] salt=new byte[16];
        new SecureRandom().nextBytes(salt);
        JSONObject next=new JSONObject().put("profile",profile).put("apps",apps)
            .put("salt",Base64.getEncoder().encodeToString(salt))
            .put("hash",Base64.getEncoder().encodeToString(hash(newCode,salt)));
        store.save(new JSONObject().put("credentials",next.toString()).put("name","Kids").put("identifier","kids-profile"));
        configuration=next;
    }

    synchronized void clear(String code)throws Exception {
        verify(code);
        store.clear();
        configuration=null;
    }

    synchronized void verify(String code)throws Exception {
        JSONObject state=configuration;
        long now=SystemClock.elapsedRealtime();
        if(now<blockedUntil)throw new IllegalArgumentException("kids_code_wait");
        if(state==null||!code.matches("[0-9]{4,8}")||!MessageDigest.isEqual(
            hash(code,Base64.getDecoder().decode(state.getString("salt"))),Base64.getDecoder().decode(state.getString("hash")))){
            if(++attempts>=5){blockedUntil=now+30000;attempts=0;}
            throw new IllegalArgumentException("invalid_kids_code");
        }
        attempts=0;
        blockedUntil=0;
    }

    private static byte[] hash(String pin,byte[] salt)throws Exception {
        PBEKeySpec password=new PBEKeySpec(pin.toCharArray(),salt,150000,256);
        try{return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(password).getEncoded();}
        finally{password.clearPassword();}
    }
}
