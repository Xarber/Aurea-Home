// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.util.AtomicFile;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

/** Bounded, opt-in local wallpaper video. The previous clip survives a bad import. */
final class VideoWallpaper {
    private static final int MAX_BYTES=48*1024*1024;
    private static final long MAX_DURATION=30000;
    private final Context context;

    VideoWallpaper(Context context){this.context=context.getApplicationContext();}

    private File location(String profile) {
        if(!"home".equals(profile)&&!UUID.fromString(profile).toString().equals(profile))
            throw new IllegalArgumentException("invalid_profile");
        return new File(new File(new File(context.getNoBackupFilesDir(),"wallpaper-videos"),profile),"clip.mp4");
    }

    String current(String profile){
        File video=location(profile);
        return video.isFile()?Uri.fromFile(video).buildUpon().appendQueryParameter("revision",Long.toString(video.lastModified())).build().toString():null;
    }

    synchronized void save(String profile,Uri source)throws Exception{
        if(!"content".equals(source.getScheme())||!"video/mp4".equals(context.getContentResolver().getType(source)))
            throw new IOException("unsupported_video");
        File candidate=File.createTempFile("wallpaper-video-",".mp4",context.getCacheDir());
        try{
            try(InputStream input=context.getContentResolver().openInputStream(source);
                FileOutputStream output=new FileOutputStream(candidate)){
                if(input==null)throw new IOException("video_unavailable");
                copy(input,output);
            }
            MediaMetadataRetriever metadata=new MediaMetadataRetriever();
            try{
                metadata.setDataSource(candidate.getPath());
                int width=number(metadata,MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH);
                int height=number(metadata,MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT);
                int duration=number(metadata,MediaMetadataRetriever.METADATA_KEY_DURATION);
                if(width<1||height<1||Math.max(width,height)>1920||Math.min(width,height)>1080||
                    duration<=0||duration>MAX_DURATION)throw new IOException("video_limits");
            }finally{metadata.release();}
            File video=location(profile);
            File parent=video.getParentFile();
            if(parent==null||!parent.isDirectory()&&!parent.mkdirs())throw new IOException("video_storage");
            AtomicFile file=new AtomicFile(video);
            try(InputStream input=new java.io.FileInputStream(candidate)){
                FileOutputStream output=file.startWrite();
                try{copy(input,output);file.finishWrite(output);}
                catch(IOException failure){file.failWrite(output);throw failure;}
            }
        }finally{candidate.delete();}
    }

    private static int number(MediaMetadataRetriever retriever,int field){
        String value=retriever.extractMetadata(field);
        return value==null?-1:Integer.parseInt(value);
    }

    private static void copy(InputStream input,FileOutputStream output)throws IOException {
        byte[] buffer=new byte[32768];
        int copied=0,count;
        while((count=input.read(buffer))!=-1){
            copied+=count;
            if(copied>MAX_BYTES)throw new IOException("video_too_large");
            output.write(buffer,0,count);
        }
    }

    synchronized void remove(String profile){
        new AtomicFile(location(profile)).delete();
    }

    static Uri playbackUri(Context context,String uri){
        if(uri==null)return null;
        Uri parsed=Uri.parse(uri);
        String path=parsed.getPath();
        if(!"file".equals(parsed.getScheme())||path==null||path.contains("..")||
            !path.startsWith(new File(context.getNoBackupFilesDir(),"wallpaper-videos").getPath()+"/")||
            !"clip.mp4".equals(parsed.getLastPathSegment()))return null;
        return Uri.fromFile(new File(path));
    }
}
