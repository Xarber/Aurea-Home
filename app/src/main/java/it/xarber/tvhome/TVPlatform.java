// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.media.AudioManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.wifi.WifiManager;
import android.provider.Settings;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import io.github.jqssun.airplay.BuildConfig;
import it.xarber.tvhome.playback.PairedPlayback;
import it.xarber.tvhome.updates.UpdateController;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.lang.ref.WeakReference;
import java.net.NetworkInterface;
import java.net.Inet4Address;
import java.util.Collections;

/** Android capabilities behind the Expo interface. No view or example data is owned here. */
public final class TVPlatform {
    private static TVPlatform shared;
    private static WeakReference<Activity> activity=new WeakReference<>(null);
    private static volatile boolean foreground;
    private static final java.util.concurrent.atomic.AtomicLong remoteInput=new java.util.concurrent.atomic.AtomicLong();
    public static synchronized TVPlatform get(Context context){if(shared==null)shared=new TVPlatform(context.getApplicationContext());return shared;}
    public static boolean foreground(){return foreground&&activity.get()!=null;}
    private final Context context;
    private final SharedPreferences prefs;
    final TVHomeCatalog catalog;
    private final RemotePlayback playback;
    private final PairedPlayback paired;
    private final UpdateController updates;
    private final HouseholdAccounts households;
    private final PhotoWallpapers photos;
    private final AndroidMediaSessions androidSessions;
    private final LocalWatchHistory watchHistory;
    private final it.xarber.tvhome.playback.MusicActivityClock androidMusicClock=new it.xarber.tvhome.playback.MusicActivityClock();
    private String androidMusicSource="";
    private static final String ANDROID_ACTIVITY_APP="android-activity-app";
    private final HomeAssistantControls homeAssistant;
    private final VideoWallpaper videoWallpaper;
    private final TitleDiscovery titleDiscovery;
    private final WatchNextShelf watchNext;
    private final PlexShelf plex;
    private Bitmap paletteArtwork;
    private JSONArray palette=new JSONArray().put("#e6eaf0").put("#929aa8");
    private final Handler main=new Handler(Looper.getMainLooper());
    private TVPlatform(Context context){this.context=context;households=HouseholdAccounts.get(context);photos=PhotoWallpapers.get(context);androidSessions=new AndroidMediaSessions(context);watchHistory=new LocalWatchHistory(context,androidSessions);homeAssistant=new HomeAssistantControls(context);videoWallpaper=new VideoWallpaper(context);titleDiscovery=new TitleDiscovery(context);watchNext=new WatchNextShelf(context);plex=new PlexShelf(context);prefs=context.getSharedPreferences("it.xarber.tvhome.MainActivity",0);catalog=new TVHomeCatalog(context,prefs);paired=PairedPlayback.get(context);playback=new RemotePlayback(context,false);if(!BuildConfig.APPLICATION_ID.endsWith(".preview"))playback.start();updates=UpdateController.get(context);}
    public void resume(Activity host){activity=new WeakReference<>(host);foreground=true;paired.resume();if(!BuildConfig.MOBILE_REMOTE){updates.observe(this::notifyUpdate);updates.resume();}if(!BuildConfig.MOBILE_REMOTE&&!BuildConfig.APPLICATION_ID.endsWith(".preview")){HomeRemoteService.ensure(context);ensureReceiver();}main.post(()->AureaTVModule.event("home-resumed",safe("pairing",paired.pairingPending())));}
    public void pause(Activity host){if(activity.get()!=host)return;foreground=false;paired.pause();updates.pause();}
    private void ensureReceiver(){if(!ReceiverSettings.enabled(context))return;context.getSharedPreferences("settings",0).edit().putBoolean("auto_start",true).putBoolean("boot_auto_start",true).putBoolean("run_in_background",true).putBoolean("launch_on_connect",true).putBoolean("auto_fullscreen",true).apply();try{context.startForegroundService(new Intent(context,io.github.jqssun.airplay.service.AirPlayService.class).setAction(io.github.jqssun.airplay.service.AirPlayService.ACTION_START_SERVER));}catch(Exception failure){AureaTVModule.event("notice",safe("message","AirPlay service could not start"));}}
    private RemotePlayback receiverPlayback(){RemotePlayback shared=HomeRemoteService.sharedPlayback();return shared!=null?shared:playback;}
    private synchronized JSONObject homeMusic(JSONObject receiver)throws Exception{
        String app=foreground()&&!BuildConfig.MOBILE_REMOTE&&households.activeId().equals("home")
            ?prefs.getString(ANDROID_ACTIVITY_APP,""):"";
        long now=android.os.SystemClock.elapsedRealtime();
        if(!app.equals(androidMusicSource)){
            androidMusicClock.visible(false,false,now);
            androidMusicSource=app;
        }
        if(app.isEmpty()||receiver.optBoolean("active"))return receiver;
        JSONObject media;
        try{media=androidSessions.activity(app);}
        catch(RuntimeException unavailable){
            androidMusicClock.visible(false,false,now);
            return receiver;
        }
        boolean visible=androidMusicClock.visible(media!=null,media!=null&&media.optBoolean("playing"),now);
        return media==null?receiver:media.put("activityVisible",visible);
    }
    private JSONObject homeMediaCommand(JSONObject request)throws Exception{
        if(!request.optString("source").equals("android-session"))return receiverPlayback().command(request);
        JSONObject music=homeMusic(receiverPlayback().state());
        if(!music.optString("source").equals("android-session")||
            !music.optString("androidPackage").equals(request.optString("androidPackage")))
            return SystemRemoteController.error("source_changed");
        String action=request.optString("action");
        if(!music.getJSONObject("controls").optBoolean(action))return SystemRemoteController.error("unsupported");
        if(action.equals("play_pause"))action=music.optBoolean("playing")?"pause":"play";
        androidSessions.control(music.getString("androidPackage"),action);
        return safe("accepted",true);
    }
    static JSONObject safe(String key,Object value){JSONObject result=new JSONObject();try{result.put(key,value);}catch(Exception ignored){}return result;}
    public static boolean key(KeyEvent event){if(!foreground()||!AureaTVModule.listening())return false;String key;
        switch(event.getKeyCode()){case KeyEvent.KEYCODE_DPAD_UP:key="up";break;case KeyEvent.KEYCODE_DPAD_DOWN:key="down";break;case KeyEvent.KEYCODE_DPAD_LEFT:key="left";break;case KeyEvent.KEYCODE_DPAD_RIGHT:key="right";break;case KeyEvent.KEYCODE_ENTER:case KeyEvent.KEYCODE_NUMPAD_ENTER:case KeyEvent.KEYCODE_DPAD_CENTER:key="select";break;case KeyEvent.KEYCODE_ESCAPE:case KeyEvent.KEYCODE_BACK:key="back";break;case KeyEvent.KEYCODE_MENU:key="control";break;case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:key="playpause";break;default:return false;}
        JSONObject value=safe("key",key);try{value.put("eventId",event.getDeviceId()+":"+event.getDownTime()+":"+event.getEventTime()+":"+event.getKeyCode()+":"+event.getAction()+":"+event.getRepeatCount()).put("phase",event.getAction()==KeyEvent.ACTION_UP?"up":"down").put("repeat",event.getRepeatCount()).put("long",event.isLongPress());}catch(Exception ignored){}AureaTVModule.event("key",value);return true;
    }
    static JSONObject remoteKey(String key)throws Exception{if(!foreground()||!AureaTVModule.listening())return SystemRemoteController.error("home_not_ready");
        if(key.equals("home")){AureaTVModule.event("home",new JSONObject());return safe("accepted",true);}
        if(key.equals("volumeup")||key.equals("volumedown")){AudioManager audio=activity.get().getSystemService(AudioManager.class);audio.adjustStreamVolume(AudioManager.STREAM_MUSIC,key.equals("volumeup")?AudioManager.ADJUST_RAISE:AudioManager.ADJUST_LOWER,0);return safe("accepted",true);}
        if(key.equals("next")||key.equals("previous")){TVPlatform platform=get(activity.get());JSONObject state=platform.receiverPlayback().state();return platform.receiverPlayback().command(new JSONObject().put("source",state.optString("source")).put("action",key));}
        String translated=key.equals("ok")?"select":key;String input="remote:"+remoteInput.incrementAndGet();AureaTVModule.event("key",new JSONObject().put("eventId",input+":down").put("key",translated).put("phase","down").put("repeat",0));AureaTVModule.event("key",new JSONObject().put("eventId",input+":up").put("key",translated).put("phase","up").put("repeat",0));return safe("accepted",true);
    }
    static void remoteEvent(String event,HomeRemoteServer server){if(!foreground())return;JSONObject value=new JSONObject();try{if(event.equals("pair-request"))value.put("pin",server.pin()).put("origin",server.requestingOrigin());}catch(Exception ignored){}AureaTVModule.event(event,value);}
    JSONObject snapshot(boolean refresh)throws Exception{
        main.post(this::notifyUpdate);JSONObject result=new JSONObject().put("schema",1).put("catalog",catalog.read(refresh));
        SharedPreferences layout=households.appearance();
        JSONObject preferences=appearance().put("dock",catalog.dock(layout)).put("startFocus",layout.getString("start-focus","dock"))
            .put("hiddenApps",new JSONArray(new java.util.TreeSet<>(layout.getStringSet("hidden-apps",java.util.Collections.emptySet()))))
            .put("householdProfile",households.activeId()).put("canUndoLayoutImport",ProfileLayout.canUndo(layout));
        try{preferences.put("folders",ProfileFolders.read(layout));}catch(org.json.JSONException invalid){/* Keep Home available with invalid saved folders. */}
        String weatherCity=layout.getString("weather-city",null);
        if(weatherCity!=null)try{preferences.put("weatherCity",new JSONObject(weatherCity));}
        catch(org.json.JSONException invalid){/* A malformed saved city falls back to the local clock. */}
        preferences.put("wallpaperScheduleEnabled",layout.getBoolean("wallpaper-schedule-enabled",false));
        String schedule=layout.getString("wallpaper-schedule",null);
        if(schedule!=null)try{preferences.put("wallpaperSchedule",new JSONObject(schedule));}
        catch(org.json.JSONException invalid){/* Use built-in default schedule. */}
        if(households.kids.active(households.activeId())){
            preferences.put("kidsProfile",true).put("kidsApps",households.kids.status().getJSONArray("apps"));
        }
        preferences.put("remoteLayoutEnabled",layout.getBoolean("remote-layout-editing",false));
        preferences.put("idleDisplay",layout.getString("idle-display","off"))
            .put("idleDisplayMinutes",layout.getInt("idle-display-minutes",5));
        preferences.put("wallpaperVideo",videoWallpaper.current(households.activeId()))
            .put("wallpaperVideoEnabled",layout.getBoolean("wallpaper-video-enabled",false));
        preferences.put("photoWallpapers",photos.list(households.activeId()))
            .put("photoWallpaperEnabled",layout.getBoolean("photo-wallpaper-enabled",false))
            .put("photoWallpaperMinutes",layout.getInt("photo-wallpaper-minutes",5));
        AudioManager audio=context.getSystemService(AudioManager.class);int maximum=audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC);int volume=Math.round(100f*audio.getStreamVolume(AudioManager.STREAM_MUSIC)/Math.max(1,maximum));
        JSONObject music=homeMusic(receiverPlayback().state());Bitmap cover=music.optString("source").equals("android-session")?null:receiverPlayback().cover();if(cover!=paletteArtwork){paletteArtwork=cover;palette=new JSONArray();for(int color:WavePalette.from(cover))palette.put(String.format(java.util.Locale.US,"#%06x",color&0xffffff));}music.put("colors",palette).put("dominance",WavePalette.dominance(cover));HomeRemoteServer remote=HomeRemoteService.server();
        result.put("preferences",preferences).put("music",music).put("network",network()).put("volume",volume).put("remoteConnected",remote!=null&&remote.hasActiveRemote()).put("paired",pairedState()).put("receiver",ReceiverSettings.state(context)).put("updates",updateState())
          .put("introductionPending",introductionPending()).put("releasePending",ReleaseHistory.pending(context)).put("lastSeenRelease",ReleaseHistory.lastSeenRelease(context)).put("build",new JSONObject().put("version",BuildConfig.VERSION_NAME).put("code",BuildConfig.VERSION_CODE).put("commit",BuildConfig.SOURCE_COMMIT).put("channel",BuildConfig.BUILD_CHANNEL));
        return result;
    }
    private boolean introductionPending() {
        if (prefs.getBoolean("introduction-seen", false)) return false;
        try {
            android.content.pm.PackageInfo info = context.getPackageManager()
                .getPackageInfo(context.getPackageName(), 0);
            return info.firstInstallTime == info.lastUpdateTime;
        } catch (android.content.pm.PackageManager.NameNotFoundException unavailable) {
            return false;
        }
    }
    private JSONObject network(){JSONObject value=new JSONObject();try{
        ConnectivityManager manager=context.getSystemService(ConnectivityManager.class);NetworkCapabilities capabilities=manager.getNetworkCapabilities(manager.getActiveNetwork());boolean connected=capabilities!=null;boolean wifi=connected&&capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
        value.put("namePermissionGranted",context.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)==android.content.pm.PackageManager.PERMISSION_GRANTED).put("locationEnabled",android.os.Build.VERSION.SDK_INT>=28&&context.getSystemService(android.location.LocationManager.class)!=null&&context.getSystemService(android.location.LocationManager.class).isLocationEnabled());
        value.put("connected",connected).put("transport",wifi?"wifi":connected&&capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)?"ethernet":"none");
        if(wifi){String ssid=context.getSystemService(WifiManager.class).getConnectionInfo().getSSID();if(ssid!=null&&!ssid.equals("<unknown ssid>")&&!ssid.equals("0x"))value.put("title",ssid.replaceAll("^\"|\"$",""));}
        value.put("observedAt",System.currentTimeMillis());
    }catch(Exception ignored){}return value;}
    private JSONObject pairedState()throws Exception{return new JSONObject().put("paired",paired.paired()).put("companion",paired.companionPaired()).put("connected",paired.connected()).put("name",paired.name()).put("pending",paired.pairingPending()).put("remaining",paired.pairingRemaining()).put("busy",paired.busy()).put("storageError",paired.storageError()).put("input",catalog.inputKey(context.getSharedPreferences("paired_device_ui",0).getString("input_id","")));}
    private void notifyUpdate(){if(!foreground()||!AureaTVModule.listening())return;it.xarber.tvhome.updates.UpdateCandidate offer=updates.candidate;if(offer!=null&&!updates.checking&&!updates.stale&&!updates.preferences.getString("notified","").equals(offer.tag)){AureaTVModule.event("notice",safe("message",AppLanguage.text(context,"Update available — open About")));updates.preferences.edit().putString("notified",offer.tag).apply();}}
    private JSONObject updateState()throws Exception{JSONObject value=new JSONObject().put("status",updates.status).put("channel",updates.channel).put("checking",updates.checking).put("ready",updates.ready).put("installing",updates.installing).put("downloaded",updates.downloaded).put("total",updates.total).put("speed",updates.speed).put("autoCheck",updates.autoCheck()).put("autoDownload",updates.autoDownload()).put("unmeteredOnly",updates.unmeteredOnly()).put("lastCheck",updates.lastSuccess()).put("stale",updates.stale);if(updates.candidate!=null)value.put("candidate",updates.candidate.json);return value;}
    JSONObject execute(String operation,JSONObject data)throws Exception{
        if(households.kids.active(households.activeId())&&!java.util.Arrays.asList(
                "snapshot","launch","image","artwork","kidsExit").contains(operation))throw new IllegalArgumentException("kids_mode");
        switch(operation){
        case "snapshot":return snapshot(data.optBoolean("refresh"));
        case "image":return catalog.image(data.getString("id"),data.optString("kind","icon"));
        case "artwork":return receiverPlayback().artwork();
        case "launch":catalog.launch(data.getString("id"));return safe("accepted",true);
        case "guestWifiQr":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            return safe("qr",qrImage(GuestWifi.qrText(data.getString("ssid"),data.optString("password"),
                data.getBoolean("secured"),data.optBoolean("hidden")),true));
        case "kidsExit":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            households.exitKids(data.getString("pin"));
            return snapshot(false);
        case "kidsStatus":case "kidsConfigure":case "kidsDisable":
            if(!foreground()||!households.activeId().equals("home"))throw new IllegalStateException("launcher_not_active");
            if(operation.equals("kidsDisable"))households.kids.clear(data.getString("oldPin"));
            if(operation.equals("kidsConfigure")){
                String child=data.getString("profile");
                if(!households.exists(child)||child.equals("home"))throw new IllegalArgumentException("unknown_child_profile");
                JSONArray desired=data.getJSONArray("apps"),verified=new JSONArray();
                if(desired.length()==0||desired.length()>32)throw new IllegalArgumentException("invalid_kids_apps");
                java.util.Set<String> unique=new java.util.HashSet<>();
                for(int i=0;i<desired.length();i++){
                    String app=desired.getString(i);
                    if(!catalog.isApp(app)||!unique.add(app))throw new IllegalArgumentException("invalid_kids_app");
                    verified.put(app);
                }
                households.kids.configure(child,verified,data.optString("oldPin"),data.getString("pin"));
            }
            return households.kids.status();
        case "watchRequests":case "watchRequestsEnable":case "watchRequestsDismiss":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            synchronized(households){
                SharedPreferences requests=households.layoutFor(data.getString("profile"));
                if(operation.equals("watchRequestsEnable"))WatchRequests.enable(requests,data.getBoolean("enabled"));
                if(operation.equals("watchRequestsDismiss"))WatchRequests.dismiss(requests,data.getString("id"));
                return WatchRequests.state(requests);
            }
        case "titleDiscoveryStatus":case "titleDiscoveryConfigure":case "titleDiscoveryDisconnect":case "titleDiscoverySearch":case "titleDiscoveryProviders":case "titleDiscoveryRelated":case "titleDiscoveryStremio":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            switch(operation){
                case "titleDiscoveryConfigure":
                    if(!households.activeId().equals("home"))throw new IllegalStateException("configuration_home_only");
                    return titleDiscovery.configure(data.getString("token"),data.getString("region"));
                case "titleDiscoveryDisconnect":
                    if(!households.activeId().equals("home"))throw new IllegalStateException("configuration_home_only");
                    return titleDiscovery.disconnect();
                case "titleDiscoverySearch":return titleDiscovery.search(data.getString("query"),households.language().equals("it"));
                case "titleDiscoveryProviders":return titleDiscovery.providers(data.getString("kind"),data.getInt("id"));
                case "titleDiscoveryRelated":return titleDiscovery.related(data.getString("kind"),data.getInt("id"),households.language().equals("it"));
                case "titleDiscoveryStremio":
                    titleDiscovery.openStremio(context,data.getString("kind"),data.getInt("id"));
                    return safe("accepted",true);
                default:return titleDiscovery.settings();
            }
        case "viewingExports":case "clearViewingExports":case "importViewingExport":case "viewingExportOpen":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            String importProfile=data.getString("profile");
            SharedPreferences importPrefs=households.layoutFor(importProfile);
            if(operation.equals("viewingExportOpen")){
                String service=data.getString("service"),video=data.optString("video");
                if(service.equals("Netflix"))catalog.launch("com.netflix.ninja");
                else{
                    if(!video.matches("[A-Za-z0-9_-]{11}")||
                        !java.util.Arrays.asList("YouTube","YouTube Music").contains(service))
                        throw new IllegalArgumentException("invalid_viewing_link");
                    JSONArray history=ViewingExports.read(importPrefs);
                    boolean present=false;
                    for(int i=0;i<history.length();i++){
                        JSONObject record=history.getJSONObject(i);
                        present|=service.equals(record.optString("service"))&&video.equals(record.optString("video"));
                    }
                    if(!present)throw new IllegalArgumentException("unknown_viewing_link");
                    String host=service.equals("YouTube Music")?"music.youtube.com":"www.youtube.com";
                    Intent open=new Intent(Intent.ACTION_VIEW,android.net.Uri.parse("https://"+host+"/watch?v="+video))
                        .setPackage("com.google.android.youtube.tv").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    if(open.resolveActivity(context.getPackageManager())==null)throw new IllegalStateException("viewing_app_unavailable");
                    context.startActivity(open);
                }
                return safe("accepted",true);
            }
            if(operation.equals("clearViewingExports"))ViewingExports.clear(importPrefs);
            if(operation.equals("importViewingExport")){
                main.post(()->{Activity host=activity.get();if(host instanceof MainActivity)((MainActivity)host).importViewingExport(importProfile);});
                return safe("accepted",true);
            }
            return new JSONObject().put("entries",ViewingExports.read(importPrefs));
        case "localWatchHistory":case "localWatchHistoryConfigure":case "localWatchHistoryClear":
            if(!foreground()||BuildConfig.MOBILE_REMOTE)throw new IllegalStateException("launcher_not_active");
            synchronized(households){
                if(operation.equals("localWatchHistoryClear"))return watchHistory.clear();
                if(operation.equals("localWatchHistoryConfigure")){
                    String tracked=data.getString("id");
                    if(!catalog.isApp(tracked))throw new IllegalArgumentException("unknown_app");
                    return watchHistory.configure(tracked,data.getBoolean("enabled"));
                }
                return watchHistory.settings();
            }
        case "mediaSessions":case "mediaSessionCommand":case "mediaAccessSettings":case "mediaActivityApp":
            if(!foreground()||BuildConfig.MOBILE_REMOTE)
                throw new IllegalStateException("launcher_not_active");
            if(operation.equals("mediaAccessSettings")){
                Intent settings=new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if(settings.resolveActivity(context.getPackageManager())==null)throw new IllegalStateException("media_settings_unavailable");
                context.startActivity(settings);
                return safe("accepted",true);
            }
            if(operation.equals("mediaSessionCommand"))androidSessions.control(data.getString("id"),data.getString("action"));
            if(operation.equals("mediaActivityApp")){
                if(!households.activeId().equals("home"))throw new IllegalStateException("profile_changed");
                String app=data.getString("id");
                if(!app.isEmpty()&&(!catalog.isApp(app)||androidSessions.activity(app)==null))
                    throw new IllegalArgumentException("media_session_unavailable");
                if(!prefs.edit().putString(ANDROID_ACTIVITY_APP,app).commit())throw new IllegalStateException("storage_failed");
            }
            return androidSessions.read().put("activityApp",households.activeId().equals("home")?prefs.getString(ANDROID_ACTIVITY_APP,""):"");
        case "importWallpaperVideo":case "removeWallpaperVideo":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            String videoProfile=data.getString("profile");
            households.layoutFor(videoProfile);
            if(operation.equals("removeWallpaperVideo")){
                videoWallpaper.remove(videoProfile);
                return snapshot(false);
            }
            main.post(()->{Activity host=activity.get();if(host instanceof MainActivity)((MainActivity)host).importWallpaperVideo(videoProfile);});
            return safe("accepted",true);
        case "importWallpaperPhotos":case "removeWallpaperPhoto":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            String photoProfile=data.getString("profile");
            households.layoutFor(photoProfile);
            if(operation.equals("removeWallpaperPhoto")){
                photos.remove(photoProfile,data.getString("uri"));
                return snapshot(false);
            }
            main.post(()->{Activity host=activity.get();if(host instanceof MainActivity)((MainActivity)host).importWallpaperPhotos(photoProfile);});
            return safe("accepted",true);
        case "haStatus":case "haConnect":case "haDisconnect":case "haEntity":case "haState":case "haCommand":case "haCamera":case "haCameraLive":
            if(!foreground()||!households.activeId().equals("home"))throw new IllegalStateException("launcher_not_active");
            switch(operation){
                case "haConnect":return homeAssistant.connect(data.getString("server"),data.getString("token"));
                case "haDisconnect":return homeAssistant.disconnect();
                case "haEntity":return homeAssistant.changeEntity(data.getString("id"),data.getBoolean("add"));
                case "haState":return homeAssistant.state(data.getString("id"));
                case "haCommand":return homeAssistant.command(data);
                case "haCamera":return homeAssistant.camera(data.getString("id"));
                case "haCameraLive":
                    String cameraId=data.getString("id");
                    if(!cameraId.matches("camera\\.[a-z0-9_]{1,120}"))throw new IllegalArgumentException("unknown_camera");
                    context.startActivity(new Intent(context,SmartHomeCameraActivity.class).putExtra("entity",cameraId)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    return safe("accepted",true);
                default:return homeAssistant.status();
            }
        case "automationStatus":
            if(!foreground()||!households.activeId().equals("home"))throw new IllegalStateException("launcher_not_active");
            return automationAddress(AutomationAccess.get(context).status());
        case "automationConfigure":
            if(!foreground()||!households.activeId().equals("home"))throw new IllegalStateException("launcher_not_active");
            return automationAddress(AutomationAccess.get(context).configure(data.getString("platform"),data.getBoolean("enabled")));
        case "navigationSound":
            if(foreground()&&households.appearance().getBoolean("navigation-sound",false)){
                AudioManager navigationAudio=context.getSystemService(AudioManager.class);
                if(navigationAudio!=null)navigationAudio.playSoundEffect(AudioManager.FX_KEYPRESS_STANDARD);
            }
            return safe("accepted",true);
        case "exportProfileLayout":case "importProfileLayout":case "undoProfileLayout":
            if(!foreground()||!households.activeId().equals(data.getString("profile")))throw new IllegalStateException("profile_changed");
            if(operation.equals("undoProfileLayout")){ProfileLayout.undo(households.appearance());return snapshot(false);}
            String layoutProfile=households.activeId();
            main.post(()->{
                Activity host=activity.get();
                if(host instanceof MainActivity){
                    if(operation.equals("exportProfileLayout"))((MainActivity)host).exportProfileLayout(layoutProfile);
                    else ((MainActivity)host).importProfileLayout(layoutProfile);
                }
            });
            return safe("accepted",true);
        case "newsFeedStatus":case "newsFeedSave":case "newsFeedRefresh":
            if(!foreground()||!households.activeId().equals(data.getString("profile")))
                throw new IllegalStateException("profile_changed");
            SharedPreferences newsPreferences=households.layoutFor(data.getString("profile"));
            if(operation.equals("newsFeedSave"))return NewsFeeds.save(newsPreferences,data.getString("feed"));
            if(operation.equals("newsFeedRefresh"))return NewsFeeds.refresh(newsPreferences.getString("headlines-feed",""));
            return NewsFeeds.state(newsPreferences);
        case "widgetList":case "widgetChange":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            SharedPreferences widgetPreferences=households.layoutFor(data.getString("profile"));
            if(operation.equals("widgetChange"))HouseholdWidgets.change(widgetPreferences,data);
            return new JSONObject().put("widgets",HouseholdWidgets.read(widgetPreferences));
        case "folderChange":
            if(!foreground()||!households.activeId().equals(data.getString("profile")))throw new IllegalStateException("profile_changed");
            ProfileFolders.change(households.appearance(),catalog,data);
            return snapshot(false);
        case "hideLauncherApp":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            String application=data.getString("id");
            if(!catalog.isApp(application))throw new IllegalArgumentException("unknown_app");
            SharedPreferences profileLayout=households.appearance();
            java.util.Set<String> hidden=new java.util.HashSet<>(profileLayout.getStringSet("hidden-apps",java.util.Collections.emptySet()));
            if(data.getBoolean("hidden"))hidden.add(application);else hidden.remove(application);
            if(!profileLayout.edit().putStringSet("hidden-apps",hidden).commit())throw new IllegalStateException("storage_failed");
            return snapshot(false);
        case "plexStatus": case "plexConnect": case "plexList": case "plexDisconnect": case "plexOpen":
            if(!foreground()||!households.activeId().equals(data.getString("profile")))throw new IllegalStateException("profile_changed");
            String plexProfile=households.activeId();
            switch(operation){
                case "plexConnect":return plex.connect(plexProfile,data.getString("server"),data.getString("key"));
                case "plexList":return plex.list(plexProfile);
                case "plexDisconnect":return plex.disconnect(plexProfile);
                case "plexOpen":plex.openApp();return safe("accepted",true);
                default:return plex.status(plexProfile);
            }
        case "watchNext":
        case "watchNextOpen":
        case "watchNextDismiss":
            if(!foreground()||!households.activeId().equals("home"))return safe("available",false);
            if(operation.equals("watchNext"))return watchNext.read();
            return watchNext.action(data.getString("id"),operation.equals("watchNextDismiss"));
        case "householdProfiles":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            return households.view();
        case "householdAppearance":
            if(!foreground()||!households.activeId().equals(data.getString("id")))throw new IllegalStateException("profile_changed");
            if(data.has("appearance")){
                JSONObject incoming=data.getJSONObject("appearance");
                if(incoming.has("dock")||incoming.has("weatherCity")||incoming.has("startFocus")||incoming.has("dockSize")||incoming.has("wallpaperClock")||incoming.has("navigationSound")||incoming.has("wallpaperSchedule")||incoming.has("wallpaperScheduleEnabled")||incoming.has("photoWallpaperEnabled")||incoming.has("photoWallpaperMinutes")||incoming.has("idleDisplay")||incoming.has("idleDisplayMinutes")||incoming.has("wallpaperVideoEnabled")||incoming.has("remoteLayoutEnabled")||incoming.has("focusSway"))throw new IllegalArgumentException("invalid_appearance");
                savePreferences(incoming);
            }
            return data.has("appearance")?snapshot(false):appearance();
        case "householdCreate":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            return households.create(data.getString("label"));
        case "householdSelect":
        case "householdSignOut":
        case "householdAutomatic":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            HomeRemoteServer profileRemote=HomeRemoteService.server();
            if(profileRemote!=null)profileRemote.closeAccountInvitation();
            if(operation.equals("householdAutomatic"))return households.automatic(data.getString("id"),data.getBoolean("enabled"));
            return operation.equals("householdSelect")?households.select(data.getString("id")):
                households.signOut(data.getString("id"),data.optBoolean("unlink"));
        case "householdSignIn":
            if(!foreground())throw new IllegalStateException("launcher_not_active");
            return households.signIn(data.getString("id"),data.getString("owner"),data.getString("session"),data.optString("name"));
        case "accountChallenge":return accountChallenge();
        case "accountInvite":
            if(!foreground())return SystemRemoteController.error("launcher_not_active");
            JSONObject hosted=HomeRemoteService.hostedInfo(true);
            HomeRemoteServer inviteServer=HomeRemoteService.server();
            String peerId=android.net.Uri.parse(hosted.optString("url")).getFragment();
            if(inviteServer==null||!hosted.optBoolean("ready")||peerId==null||!peerId.matches("tv=[a-f0-9-]{36}"))
                return SystemRemoteController.error("remote_unavailable");
            String label=Settings.Global.getString(context.getContentResolver(),"device_name");
            boolean automatic=data.optBoolean("automatic");
            if(automatic){
                JSONObject profile=households.view();
                if(!profile.optBoolean("automatic")||!data.optString("profile").equals(profile.optString("active")))
                    throw new IllegalStateException("automatic_pairing_disabled");
            }
            return inviteServer.openAccountInvitation(automatic).put("peer",peerId.substring(3))
                .put("label",label==null||label.trim().isEmpty()?"Aurea Home":label);
        case "accountInviteCancel":
            HomeRemoteServer invitation=HomeRemoteService.server();
            if(invitation!=null)invitation.closeAccountInvitation();
            return safe("accepted",true);
        case "accountRemotes":
            HomeRemoteServer accountRemoteServer = HomeRemoteService.server();
            return new JSONObject().put("remotes", accountRemoteServer == null ?
                new org.json.JSONArray() : accountRemoteServer.listAccountRemotes());
        case "accountRemoteRevoke":
            if(!foreground())return SystemRemoteController.error("launcher_not_active");
            HomeRemoteServer revokeServer = HomeRemoteService.server();
            if(revokeServer==null)return SystemRemoteController.error("remote_unavailable");
            households.disableAutomaticPairing();
            revokeServer.closeAccountInvitation();
            return revokeServer.revokeAccountRemote(data.optString("id"));
        case "accountQr":
            String code=data.getString("code");
            if(!code.matches("[A-Z0-9-]{6,10}"))throw new IllegalArgumentException("invalid_code");
            return safe("qr",qrImage("https://id.xcenter.it/device?code="+code));
        case "preferences":synchronized(households){savePreferences(data);}return snapshot(false);
        case "wifiName":main.post(()->{Activity host=activity.get();if(host instanceof MainActivity)((MainActivity)host).requestWifiName();});return safe("accepted",true);
        case "navigationTrace":String direction=data.optString("direction"),from=data.optString("from"),to=data.optString("to");if(direction.matches("up|down|left|right")&&from.matches("none|header|modal|page-[0-2]")&&to.matches("none|header|modal|page-[0-2]"))android.util.Log.i("AureaHomeUI","direction="+direction+" from="+from+" to="+to+" moved="+data.optBoolean("moved"));return safe("accepted",true);
        case "settings":openSettings(data.getString("screen"));return safe("accepted",true);
        case "uninstall":catalog.appAction(data.getString("id"),true);return safe("accepted",true);
        case "appInfo":catalog.appAction(data.getString("id"),false);return safe("accepted",true);
        case "media":return homeMediaCommand(data);
        case "volume":int value=data.getInt("value");if(value<0||value>100)throw new IllegalArgumentException("invalid_volume");AudioManager audio=context.getSystemService(AudioManager.class);audio.setStreamVolume(AudioManager.STREAM_MUSIC,Math.round(audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC)*value/100f),0);return safe("accepted",true);
        case "receiverSettings":
            ReceiverSettings.save(context,data);
            main.post(()->{
                if(!ReceiverSettings.enabled(context)){
                    receiverPlayback().stopReceiver();
                }else ensureReceiver();
            });
            return snapshot(false);
        case "startReceiver":main.post(this::ensureReceiver);return safe("accepted",true);
        case "backgroundAccess":main.post(()->HomeForeground.settings(context));return safe("accepted",true);
        case "remote":HomeRemoteService.enable(context);return remoteInfo();
        case "hostedRemote":return hostedRemoteInfo();
        case "revokeRemotes":HomeRemoteServer remote=HomeRemoteService.server();if(remote!=null)remote.revokeAll();return safe("accepted",true);
        case "exportPreferences":return safe("text",HomePreferences.export(context,prefs));
        case "restorePreferences":HomePreferences.restore(context,prefs,data.getString("text"));return snapshot(true);
        case "inputProfile":String port=data.getString("id");String profile=data.getString("profile");if(!port.matches("hdmi[0-9]{1,2}")||!java.util.Arrays.asList("generic","nintendo","gaming","appletv","nintendoswitch","playstation","xbox","wiiu").contains(profile))throw new IllegalArgumentException("invalid_profile");prefs.edit().putString("input-profile-"+port.substring(4),profile).apply();return snapshot(true);
        case "checkUpdates":updates.check(true);return updateState();
        case "downloadUpdate":updates.download();return updateState();
        case "installUpdate":main.post(updates::install);return updateState();
        case "cancelUpdate":updates.cancel();return updateState();
        case "updatePreference":String key=data.getString("key");if(!java.util.Arrays.asList("auto_check","auto_download","unmetered").contains(key))throw new IllegalArgumentException("invalid_preference");updates.toggle(key);return updateState();
        case "unpairAppleTV":main.post(paired::unpair);return safe("accepted",true);
        case "cancelPairing":main.post(paired::cancelPairing);return safe("accepted",true);
        case "pairedInput":String input=catalog.inputId(data.getString("id"));context.getSharedPreferences("paired_device_ui",0).edit().putString("input_id",input).apply();return pairedState();
        case "introductionSeen":if(introductionPending())ReleaseHistory.markSeen(context);prefs.edit().putBoolean("introduction-seen",true).apply();return safe("accepted",true);
        case "releaseSeen":ReleaseHistory.markSeen(context);return safe("accepted",true);
        case "backupPreferences":main.post(()->{Activity host=activity.get();if(host instanceof MainActivity)((MainActivity)host).exportPreferences();});return safe("accepted",true);
        case "importPreferences":main.post(()->{Activity host=activity.get();if(host instanceof MainActivity)((MainActivity)host).importPreferences();});return safe("accepted",true);
        case "developerChangelog":try(java.io.InputStream source=context.getAssets().open("developer-changelog.txt")){return safe("text",new String(read(source),java.nio.charset.StandardCharsets.UTF_8));}
        case "changelog":try(java.io.InputStream source=context.getAssets().open("release-history.json")){return new JSONObject(new String(read(source),java.nio.charset.StandardCharsets.UTF_8));}
        case "diagnostics":return safe("text",it.xarber.tvhome.diagnostics.Diagnostics.report(context,receiverPlayback().receiverReady(),HomeRemoteService.server()!=null)+paired.diagnosticHistory());
        case "recovery":context.startActivity(new Intent(context,LegacyHomeActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));return safe("accepted",true);
        default:throw new IllegalArgumentException("unsupported");
        }
    }
    private static byte[] read(java.io.InputStream input)throws Exception{java.io.ByteArrayOutputStream output=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[4096];int count;while((count=input.read(buffer))!=-1)output.write(buffer,0,count);return output.toByteArray();}
    JSONObject remoteWatchRequest(JSONObject data)throws Exception {
        synchronized(households){
            if(households.kids.active(households.activeId()))return SystemRemoteController.error("watch_requests_disabled");
            return WatchRequests.submit(households.appearance(),data.optString("title"));
        }
    }

    JSONObject remoteLayout(JSONObject input)throws Exception{
        synchronized(households){
            String profile=households.activeId();
            SharedPreferences settings=households.appearance();
            if(households.kids.active(profile)||!settings.getBoolean("remote-layout-editing",false))
                return SystemRemoteController.error("layout_access_disabled");
            JSONArray dock=catalog.dock(settings);
            String wallpaper=settings.getString("wallpaper","classic");
            String revision=layoutRevision(profile,dock,wallpaper);
            String action=input.optString("action","read");
            if(!action.equals("read")){
                if(!revision.equals(input.optString("revision")))return SystemRemoteController.error("layout_changed");
                if(action.equals("swap")){
                    int index=input.optInt("index",-1),target=input.optInt("target",-1);
                    if(index<0||index>5||target<0||target>5||Math.abs(index-target)!=1)
                        return SystemRemoteController.error("invalid_dock");
                    String from=dock.getString(index),to=dock.getString(target);
                    if(from.equals("all")||to.equals("all"))return SystemRemoteController.error("fixed_library_slot");
                    dock.put(index,to).put(target,from);
                    try{savePreferences(new JSONObject().put("dock",dock));}
                    catch(IllegalArgumentException unavailable){return SystemRemoteController.error("invalid_dock");}
                }else if(action.equals("wallpaper")){
                    wallpaper=input.getString("wallpaper");
                    if(!WallpaperArt.valid(wallpaper))return SystemRemoteController.error("invalid_wallpaper");
                    savePreferences(new JSONObject().put("wallpaper",wallpaper));
                }else return SystemRemoteController.error("unsupported");
            }
            JSONArray entries=catalog.read(false),rows=new JSONArray();
            for(int i=0;i<dock.length();i++){
                String id=dock.getString(i),name=id;
                for(int j=0;j<entries.length();j++){
                    JSONObject item=entries.getJSONObject(j);
                    if(id.equals(item.optString("id"))){name=item.optString("name",id);break;}
                }
                rows.put(new JSONObject().put("id",id).put("name",name));
            }
            return new JSONObject().put("dock",rows).put("wallpaper",wallpaper)
                .put("revision",layoutRevision(profile,dock,wallpaper));
        }
    }

    private static String layoutRevision(String profile,JSONArray dock,String wallpaper)throws Exception{
        byte[] digest=java.security.MessageDigest.getInstance("SHA-256").digest(
            (profile+"\n"+dock+"\n"+wallpaper).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return android.util.Base64.encodeToString(digest,android.util.Base64.NO_PADDING|android.util.Base64.NO_WRAP|android.util.Base64.URL_SAFE);
    }

    private JSONObject automationAddress(JSONObject result)throws Exception {
        HomeRemoteServer server=HomeRemoteService.server();
        if(server==null)return result;
        for(NetworkInterface network:Collections.list(NetworkInterface.getNetworkInterfaces()))
            for(java.net.InetAddress addr:Collections.list(network.getInetAddresses()))
                if(addr instanceof Inet4Address&&addr.isSiteLocalAddress()&&!addr.isLoopbackAddress())
                    return result.put("url","http://"+addr.getHostAddress()+(server.port()==80?"":":"+server.port()));
        return result;
    }

    private JSONObject appearance() throws Exception {
        SharedPreferences settings=households.appearance();
        return new JSONObject()
            .put("wallpaper",settings.getString("wallpaper","classic"))
            .put("motion",settings.getBoolean("wallpaper-motion",false))
            .put("glass",settings.getBoolean("activity-background",true))
            .put("blur",settings.getBoolean("blur-enabled",true))
            .put("musicTint",settings.getBoolean("music-wallpaper-tint",false))
            .put("language",households.language())
            .put("dockSize",settings.getString("dock-size","standard"))
            .put("wallpaperClock",settings.getString("wallpaper-clock","off"))
            .put("focusSway",settings.getBoolean("focus-sway",false))
            .put("navigationSound",settings.getBoolean("navigation-sound",false));
    }

    private void savePreferences(JSONObject data)throws Exception {
        SharedPreferences.Editor edit=households.appearance().edit();
        boolean primary=households.activeId().equals("home");
        if(data.has("remoteLayoutEnabled"))edit.putBoolean("remote-layout-editing",data.getBoolean("remoteLayoutEnabled"));
        if(data.has("dock"))catalog.writeDock(data.getJSONArray("dock"),edit);
        if(data.has("startFocus")){
            String start=data.getString("startFocus");
            if(!java.util.Arrays.asList("dock","inputs","apps").contains(start))throw new IllegalArgumentException("invalid_start_focus");
            edit.putString("start-focus",start);
        }
        if(data.has("dockSize")){
            String size=data.getString("dockSize");
            if(!java.util.Arrays.asList("compact","standard","large").contains(size))throw new IllegalArgumentException("invalid_dock_size");
            edit.putString("dock-size",size);
        }
        if(data.has("idleDisplay")){
            String display=data.getString("idleDisplay");
            if(!java.util.Arrays.asList("off","dim","clock","black").contains(display))throw new IllegalArgumentException("invalid_idle_display");
            edit.putString("idle-display",display);
        }
        if(data.has("idleDisplayMinutes")){
            int minutes=data.getInt("idleDisplayMinutes");
            if(!java.util.Arrays.asList(2,5,15,30).contains(minutes))throw new IllegalArgumentException("invalid_idle_delay");
            edit.putInt("idle-display-minutes",minutes);
        }
        if(data.has("wallpaperVideoEnabled"))edit.putBoolean("wallpaper-video-enabled",data.getBoolean("wallpaperVideoEnabled"));
        if(data.has("photoWallpaperEnabled"))edit.putBoolean("photo-wallpaper-enabled",data.getBoolean("photoWallpaperEnabled"));
        if(data.has("photoWallpaperMinutes")){
            int minutes=data.getInt("photoWallpaperMinutes");
            if(!java.util.Arrays.asList(1,5,15,60).contains(minutes))throw new IllegalArgumentException("invalid_photo_interval");
            edit.putInt("photo-wallpaper-minutes",minutes);
        }
        if(data.has("wallpaperScheduleEnabled"))edit.putBoolean("wallpaper-schedule-enabled",data.getBoolean("wallpaperScheduleEnabled"));
        if(data.has("wallpaperSchedule"))edit.putString("wallpaper-schedule",
            WallpaperArt.validateSchedule(data.getJSONObject("wallpaperSchedule")).toString());
        if(data.has("wallpaperClock")){
            String clock=data.getString("wallpaperClock");
            if(!java.util.Arrays.asList("off","minimal","stacked").contains(clock))throw new IllegalArgumentException("invalid_clock");
            edit.putString("wallpaper-clock",clock);
        }
        if(data.has("focusSway"))edit.putBoolean("focus-sway",data.getBoolean("focusSway"));
        if(data.has("navigationSound"))edit.putBoolean("navigation-sound",data.getBoolean("navigationSound"));
        String language=data.has("language")?data.getString("language"):null;
        if(language!=null&&!language.equals("it")&&!language.equals("en"))throw new IllegalArgumentException("invalid_language");
        if(data.has("wallpaper")){
            String value=data.getString("wallpaper");
            if(!WallpaperArt.valid(value))throw new IllegalArgumentException("invalid_wallpaper");
            edit.putString("wallpaper",value);
        }
        if(data.has("weatherCity")){
            JSONObject city=data.optJSONObject("weatherCity");
            if(data.isNull("weatherCity"))edit.remove("weather-city");
            else {
                if(city==null)throw new IllegalArgumentException("invalid_weather_city");
                String label=city.getString("label");
                double latitude=city.getDouble("latitude"),longitude=city.getDouble("longitude");
                if(label.trim().isEmpty()||label.length()>160||!Double.isFinite(latitude)||!Double.isFinite(longitude)||
                   Math.abs(latitude)>90||Math.abs(longitude)>180)throw new IllegalArgumentException("invalid_weather_city");
                JSONObject sanitized=new JSONObject().put("label",label).put("latitude",Math.round(latitude*100)/100.0)
                    .put("longitude",Math.round(longitude*100)/100.0);
                edit.putString("weather-city",sanitized.toString());
            }
        }
        if(data.has("musicTint"))edit.putBoolean("music-wallpaper-tint",data.getBoolean("musicTint"));
        if(data.has("blur"))edit.putBoolean("blur-enabled",data.getBoolean("blur"));
        if(data.has("motion"))edit.putBoolean("wallpaper-motion",data.getBoolean("motion"));
        if(data.has("glass"))edit.putBoolean("activity-background",data.getBoolean("glass"));
        if(language!=null&&!primary)edit.putString("language",language);
        if(!edit.commit())throw new IllegalStateException("storage_failed");
        if(language!=null&&primary)AppLanguage.set(context,language);
    }
    private void openSettings(String screen)throws Exception{String action;switch(screen){case "network":action=Settings.ACTION_WIFI_SETTINGS;break;case "display":action=Settings.ACTION_DISPLAY_SETTINGS;break;case "location":action=Settings.ACTION_LOCATION_SOURCE_SETTINGS;break;case "sound":action=Settings.ACTION_SOUND_SETTINGS;break;case "inputs":action=Settings.ACTION_SETTINGS;break;case "airplay":context.startActivity(new Intent(context,io.github.jqssun.airplay.MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));return;default:action=Settings.ACTION_SETTINGS;}
        Intent intent=new Intent(action);if(screen.equals("display")){Intent picture=new Intent("com.mitv.settings.PICTURE_SETTINGS");if(context.getPackageManager().resolveActivity(picture,0)!=null)intent=picture;}if(context.getPackageManager().resolveActivity(intent,0)==null)intent=new Intent(Settings.ACTION_SETTINGS);context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));}
    private static JSONObject accountChallenge() throws Exception {
        byte[] random = new byte[32];
        new java.security.SecureRandom().nextBytes(random);
        int flags = android.util.Base64.URL_SAFE | android.util.Base64.NO_WRAP | android.util.Base64.NO_PADDING;
        String proof = android.util.Base64.encodeToString(random, flags);
        byte[] hash = java.security.MessageDigest.getInstance("SHA-256")
            .digest(proof.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        return new JSONObject().put("proof", proof)
            .put("challenge", android.util.Base64.encodeToString(hash, flags));
    }
    private static String qrImage(String text) throws Exception {
        return qrImage(text,false);
    }
    private static String qrImage(String text, boolean unicode) throws Exception {
        java.util.Map<com.google.zxing.EncodeHintType,?> hints = unicode
            ? Collections.singletonMap(com.google.zxing.EncodeHintType.CHARACTER_SET, "UTF-8") : null;
        com.google.zxing.common.BitMatrix matrix = new com.google.zxing.qrcode.QRCodeWriter()
            .encode(text, com.google.zxing.BarcodeFormat.QR_CODE, 300, 300, hints);
        Bitmap bitmap = Bitmap.createBitmap(300, 300, Bitmap.Config.ARGB_8888);
        try {
            for (int y = 0; y < 300; y++) for (int x = 0; x < 300; x++)
                bitmap.setPixel(x, y, matrix.get(x, y) ? Color.BLACK : Color.WHITE);
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, bytes);
            return "data:image/png;base64," + android.util.Base64.encodeToString(bytes.toByteArray(), android.util.Base64.NO_WRAP);
        } finally {
            bitmap.recycle();
        }
    }
    private JSONObject hostedRemoteInfo() throws Exception {
        JSONObject info = HomeRemoteService.hostedInfo(true);
        if (info.has("error")) return info;
        return info.put("qr", qrImage(info.getString("url")));
    }
    private JSONObject remoteInfo()throws Exception{HomeRemoteServer server=HomeRemoteService.server();if(server==null){HomeRemoteService.enable(context);long deadline=android.os.SystemClock.elapsedRealtime()+2000;while(server==null&&android.os.SystemClock.elapsedRealtime()<deadline&&Looper.myLooper()!=Looper.getMainLooper()){Thread.sleep(25);server=HomeRemoteService.server();}}if(server==null)throw new IllegalStateException("remote_unavailable");server.rotatePairing();String address=null;for(NetworkInterface network:Collections.list(NetworkInterface.getNetworkInterfaces()))for(java.net.InetAddress candidate:Collections.list(network.getInetAddresses()))if(candidate instanceof Inet4Address&&!candidate.isLoopbackAddress()&&candidate.isSiteLocalAddress())address=candidate.getHostAddress();if(address==null)throw new IllegalStateException("network_unavailable");String url="http://"+address+(server.port()==80?"":":"+server.port())+"/";String pin=server.pin();com.google.zxing.common.BitMatrix matrix=new com.google.zxing.qrcode.QRCodeWriter().encode(url+"#pair="+pin,com.google.zxing.BarcodeFormat.QR_CODE,300,300);Bitmap bitmap=Bitmap.createBitmap(300,300,Bitmap.Config.ARGB_8888);for(int y=0;y<300;y++)for(int x=0;x<300;x++)bitmap.setPixel(x,y,matrix.get(x,y)?Color.BLACK:Color.WHITE);java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();bitmap.compress(Bitmap.CompressFormat.PNG,100,bytes);bitmap.recycle();return new JSONObject().put("backgroundAccess",HomeForeground.accessGranted(context)).put("url",url).put("pin",pin).put("qr","data:image/png;base64,"+android.util.Base64.encodeToString(bytes.toByteArray(),android.util.Base64.NO_WRAP));}
    float[] waveform(){return receiverPlayback().waveform();}
    void pairedRequest(String operation,JSONObject data,java.util.function.Consumer<JSONObject> callback){if(!java.util.Arrays.asList("scan","pair_begin","companion_begin","pair_finish","cancel_pairing","apps","launch_app","navigation").contains(operation)){callback.accept(SystemRemoteController.error("unsupported"));return;}main.post(()->paired.request(operation,data,callback));}
}
