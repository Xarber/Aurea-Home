// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import it.xarber.tvhome.playback.PairingStore;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;
import org.json.JSONObject;

/** Local smart-home adapters use separate, narrowly scoped credentials. */
final class AutomationAccess {
    private static AutomationAccess instance;
    private final PairingStore store;
    private final JSONObject keys;
    private final String epoch=UUID.randomUUID().toString();
    private final AutomationProof proof=new AutomationProof();

    static synchronized AutomationAccess get(Context context)throws Exception {
        if(instance==null)instance=new AutomationAccess(context.getApplicationContext());
        return instance;
    }

    private AutomationAccess(Context context)throws Exception {
        store=new PairingStore(context,"smart-home");
        JSONObject saved=store.read();
        keys=saved==null?new JSONObject():new JSONObject(saved.getString("credentials"));
    }

    private static boolean supported(String platform){
        return platform.equals("homeassistant")||platform.equals("homebridge");
    }

    synchronized JSONObject status()throws Exception {
        return new JSONObject().put("homeassistant",keys.has("homeassistant")).put("homebridge",keys.has("homebridge"));
    }

    synchronized JSONObject configure(String platform,boolean enable)throws Exception {
        if(!supported(platform))throw new IllegalArgumentException("invalid_platform");
        String previous=keys.optString(platform);
        String token=null;
        if(enable){
            byte[] raw=new byte[32];
            new SecureRandom().nextBytes(raw);
            token=Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
            keys.put(platform,token);
        }else keys.remove(platform);
        try{
            store.save(new JSONObject().put("credentials",keys.toString()).put("identifier","smart-home").put("name","Aurea"));
        }catch(Exception error){
            if(previous.isEmpty())keys.remove(platform);else keys.put(platform,previous);
            throw error;
        }
        JSONObject result=status();
        if(token!=null)result.put("key",token);
        return result;
    }

    String epoch(){return epoch;}

    synchronized Grant accept(JSONObject request,long now)throws Exception {
        String platform=request.optString("platform");
        if(!supported(platform)||!keys.has(platform)||!epoch.equals(request.optString("epoch")))return null;
        String nonce=request.optString("nonce");
        String encoded=request.optString("body");
        String signed=request.optString("signature");
        long timestamp=request.optLong("timestamp",-1);
        String secret=keys.getString(platform);
        if(!proof.claim(secret,platform,epoch,timestamp,nonce,encoded,signed,now))return null;
        JSONObject payload=new JSONObject(new String(Base64.getUrlDecoder().decode(encoded),StandardCharsets.UTF_8));
        return new Grant(platform,secret,nonce,payload);
    }

    synchronized JSONObject reply(Grant grant,JSONObject result)throws Exception {
        if(!grant.secret.equals(keys.optString(grant.platform)))return null;
        String body=Base64.getUrlEncoder().withoutPadding().encodeToString(result.toString().getBytes(StandardCharsets.UTF_8));
        String signature=AutomationProof.response(grant.secret,grant.platform,grant.nonce,body);
        return new JSONObject().put("body",body).put("signature",signature);
    }

    static final class Grant {
        final String platform,secret,nonce;
        final JSONObject payload;
        Grant(String platform,String secret,String nonce,JSONObject payload){
            this.platform=platform;this.secret=secret;this.nonce=nonce;this.payload=payload;
        }
    }
}
