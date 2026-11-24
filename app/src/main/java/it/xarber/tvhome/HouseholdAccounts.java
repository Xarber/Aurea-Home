// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import it.xarber.tvhome.playback.PairingStore;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.UUID;

/** TV-local profiles and device-bound sessions. No account data enters launcher snapshots. */
final class HouseholdAccounts {
    private static HouseholdAccounts instance;
    private final PairingStore store;

    static synchronized HouseholdAccounts get(Context context) {
        if(instance==null)instance=new HouseholdAccounts(context.getApplicationContext());
        return instance;
    }

    private HouseholdAccounts(Context context) {
        store = new PairingStore(context, "household-accounts");
    }

    private JSONObject read() throws Exception {
        JSONObject saved=store.read();
        if(saved!=null)return new JSONObject(saved.getString("credentials"));
        return new JSONObject().put("active","home").put("profiles",
            new JSONArray().put(new JSONObject().put("id","home").put("label","Home")));
    }

    private void write(JSONObject state) throws Exception {
        store.save(new JSONObject().put("credentials",state.toString())
            .put("identifier","household").put("name","Aurea"));
    }

    private JSONObject find(JSONObject state,String id) throws Exception {
        JSONArray profiles=state.getJSONArray("profiles");
        for(int i=0;i<profiles.length();i++){
            JSONObject profile=profiles.getJSONObject(i);
            if(id.equals(profile.getString("id")))return profile;
        }
        throw new IllegalArgumentException("unknown_profile");
    }

    synchronized JSONObject view() throws Exception {
        JSONObject state=read();
        JSONObject active=find(state,state.getString("active"));
        JSONArray visible=new JSONArray();
        JSONArray profiles=state.getJSONArray("profiles");
        for(int i=0;i<profiles.length();i++){
            JSONObject profile=profiles.getJSONObject(i);
            visible.put(new JSONObject().put("id",profile.getString("id")).put("label",profile.getString("label"))
                .put("linked",profile.has("owner")));
        }
        JSONObject result=new JSONObject().put("active",active.getString("id")).put("profiles",visible)
            .put("automatic",active.optBoolean("automatic")).put("label",active.getString("label"));
        if(active.has("session"))result.put("account",new JSONObject().put("session",active.getString("session"))
            .put("name",active.optString("name")));
        return result;
    }

    synchronized JSONObject create(String label) throws Exception {
        label=label.trim();
        if(label.isEmpty()||label.length()>32||label.matches("(?s).*[\\p{Cc}\\p{Cf}].*"))
            throw new IllegalArgumentException("invalid_profile_name");
        JSONObject state=read();
        JSONArray profiles=state.getJSONArray("profiles");
        if(profiles.length()>=8)throw new IllegalArgumentException("too_many_profiles");
        for(int i=0;i<profiles.length();i++){
            if(profiles.getJSONObject(i).getString("label").equalsIgnoreCase(label))
                throw new IllegalArgumentException("duplicate_profile_name");
        }
        profiles.put(new JSONObject().put("id",UUID.randomUUID().toString()).put("label",label));
        write(state);
        return view();
    }

    synchronized JSONObject select(String id) throws Exception {
        JSONObject state=read();
        find(state,id);
        state.put("active",id);
        write(state);
        return view();
    }

    synchronized JSONObject signIn(String id, String owner, String session, String name) throws Exception {
        if(!owner.matches("[a-z0-9]{64}")||!session.matches("[A-Za-z0-9_-]{43}")||name.length()>120)
            throw new IllegalArgumentException("invalid_account");
        JSONObject state=read();
        if(!id.equals(state.getString("active")))throw new IllegalStateException("profile_changed");
        JSONObject active=find(state,id);
        if(active.has("owner")&&!owner.equals(active.getString("owner")))
            throw new IllegalStateException("profile_already_linked");
        JSONArray profiles=state.getJSONArray("profiles");
        for(int i=0;i<profiles.length();i++){
            JSONObject profile=profiles.getJSONObject(i);
            if(!id.equals(profile.optString("id"))&&owner.equals(profile.optString("owner")))
                throw new IllegalStateException("account_on_another_profile");
        }
        active.put("owner",owner).put("session",session).put("name",name);
        write(state);
        return view();
    }

    synchronized JSONObject signOut(String id,boolean unlink) throws Exception {
        JSONObject state=read();
        JSONObject profile=find(state,id);
        profile.remove("session");
        profile.remove("name");
        profile.remove("automatic");
        if(unlink)profile.remove("owner");
        write(state);
        return view();
    }

    synchronized JSONObject automatic(String id, boolean enabled) throws Exception {
        JSONObject state=read();
        if(!id.equals(state.getString("active")))throw new IllegalStateException("profile_changed");
        JSONObject profile=find(state,id);
        if(enabled&&!profile.has("session"))throw new IllegalStateException("sign_in_required");
        profile.put("automatic",enabled);
        write(state);
        return view();
    }

    synchronized void disableAutomaticPairing() throws Exception {
        JSONObject state=read();
        JSONArray profiles=state.getJSONArray("profiles");
        for(int i=0;i<profiles.length();i++)profiles.getJSONObject(i).remove("automatic");
        write(state);
    }
}
