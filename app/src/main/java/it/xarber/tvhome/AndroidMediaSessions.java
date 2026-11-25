// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.ComponentName;
import android.content.Context;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/** Inspect the system's active controllers only, without reading notification contents. */
final class AndroidMediaSessions {
    private final Context context;
    private final MediaSessionManager sessions;
    AndroidMediaSessions(Context context){
        this.context=context;
        sessions=context.getSystemService(MediaSessionManager.class);
    }

    private List<MediaController> controllers(){
        if(sessions==null)return null;
        try{return sessions.getActiveSessions(new ComponentName(context,MediaAccessListener.class));}
        catch(SecurityException unavailable){return null;}
    }

    JSONObject read()throws Exception{
        List<MediaController> connected=controllers();
        JSONArray values=new JSONArray();
        java.util.Set<String> seen=new java.util.HashSet<>();
        if(connected!=null)for(MediaController controller:connected){
            if(values.length()>=12)break;
            if(controller.getPackageName().equals(context.getPackageName()))continue;
            PlaybackState state=controller.getPlaybackState();
            MediaMetadata metadata=controller.getMetadata();
            if(state==null||metadata==null||state.getState()==PlaybackState.STATE_NONE||
                state.getState()==PlaybackState.STATE_STOPPED||state.getState()==PlaybackState.STATE_ERROR)continue;
            String title=label(metadata.getString(MediaMetadata.METADATA_KEY_TITLE));
            if(title.isEmpty()||!seen.add(controller.getPackageName()))continue;
            JSONObject card=new JSONObject().put("package",controller.getPackageName()).put("title",title)
                .put("artist",label(metadata.getString(MediaMetadata.METADATA_KEY_ARTIST)))
                .put("playing",state.getState()==PlaybackState.STATE_PLAYING)
                .put("canPlay",can(state,PlaybackState.ACTION_PLAY|PlaybackState.ACTION_PLAY_PAUSE))
                .put("canPause",can(state,PlaybackState.ACTION_PAUSE|PlaybackState.ACTION_PLAY_PAUSE))
                .put("canNext",can(state,PlaybackState.ACTION_SKIP_TO_NEXT))
                .put("canPrevious",can(state,PlaybackState.ACTION_SKIP_TO_PREVIOUS));
            long duration=metadata.getLong(MediaMetadata.METADATA_KEY_DURATION),position=state.getPosition();
            if(duration>0&&position>=0&&position<=duration)card.put("duration",duration).put("position",position);
            values.put(card);
        }
        return new JSONObject().put("available",connected!=null).put("sessions",values);
    }

    void control(String id,String action){
        List<MediaController> connected=controllers();
        if(connected==null)throw new IllegalStateException("media_access_unavailable");
        for(MediaController controller:connected){
            if(!controller.getPackageName().equals(id)||id.equals(context.getPackageName()))continue;
            PlaybackState state=controller.getPlaybackState();
            if(state==null)continue;
            long flags;
            switch(action){
                case "play":flags=PlaybackState.ACTION_PLAY;break;
                case "pause":flags=PlaybackState.ACTION_PAUSE;break;
                case "next":flags=PlaybackState.ACTION_SKIP_TO_NEXT;break;
                case "previous":flags=PlaybackState.ACTION_SKIP_TO_PREVIOUS;break;
                default:throw new IllegalArgumentException("unsupported_media_action");
            }
            if(!can(state,flags)){
                boolean playing=state.getState()==PlaybackState.STATE_PLAYING;
                if(((action.equals("play")&&!playing)||(action.equals("pause")&&playing))&&
                    can(state,PlaybackState.ACTION_PLAY_PAUSE)){
                    controller.dispatchMediaButtonEvent(new android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN,android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE));
                    controller.dispatchMediaButtonEvent(new android.view.KeyEvent(android.view.KeyEvent.ACTION_UP,android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE));
                    return;
                }
                continue;
            }
            MediaController.TransportControls controls=controller.getTransportControls();
            switch(action){
                case "play":controls.play();break;
                case "pause":controls.pause();break;
                case "next":controls.skipToNext();break;
                case "previous":controls.skipToPrevious();break;
                default:throw new IllegalArgumentException("unsupported_media_action");
            }
            return;
        }
        throw new IllegalArgumentException("media_session_unavailable");
    }

    private static boolean can(PlaybackState state,long action){return (state.getActions()&action)!=0;}
    private static String label(String value){
        if(value==null)return "";
        String safe=value.replaceAll("[\\p{Cc}\\p{Cf}]"," ").trim();
        return safe.substring(0,Math.min(160,safe.length()));
    }
}
