// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

final class AutomationProof {
    private static final long TOLERANCE=30;
    private final LinkedHashMap<String,Long> recent=new LinkedHashMap<>();

    boolean claim(String secret,String platform,String epoch,long timestamp,String nonce,String body,String signature,long now)throws Exception {
        if(!nonce.matches("[A-Za-z0-9_-]{22}")||!body.matches("[A-Za-z0-9_-]{3,3000}")||
            !signature.matches("[A-Za-z0-9_-]{43}")||timestamp<now-TOLERANCE||timestamp>now+TOLERANCE)return false;
        String id=platform+":"+nonce;
        recent.entrySet().removeIf(item->item.getValue()<now);
        if(recent.containsKey(id)||recent.size()>=512)return false;
        String expected=sign(secret,"aurea-automation-request-v1\n"+platform+"\n"+epoch+"\n"+timestamp+"\n"+nonce+"\n"+body);
        if(!MessageDigest.isEqual(signature.getBytes(StandardCharsets.US_ASCII),expected.getBytes(StandardCharsets.US_ASCII)))return false;
        recent.put(id,timestamp+TOLERANCE);
        return true;
    }

    static String response(String secret,String platform,String nonce,String body)throws Exception {
        return sign(secret,"aurea-automation-response-v1\n"+platform+"\n"+nonce+"\n"+body);
    }

    private static String sign(String secret,String text)throws Exception {
        Mac mac=Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(Base64.getUrlDecoder().decode(secret),"HmacSHA256"));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(text.getBytes(StandardCharsets.UTF_8)));
    }
}
