// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import android.graphics.Matrix;
import android.graphics.SurfaceTexture;
import android.media.MediaPlayer;
import android.net.Uri;
import android.view.Surface;
import android.view.TextureView;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

/** The texture can be composed behind banners and under the existing wallpaper blur. */
public final class WallpaperVideoManager extends SimpleViewManager<WallpaperVideoManager.WallpaperTexture> {
    @Override public String getName(){return "AureaWallpaperVideo";}
    @Override protected WallpaperTexture createViewInstance(ThemedReactContext context){return new WallpaperTexture(context);}
    @ReactProp(name="clip") public void setClip(WallpaperTexture view,String clip){view.source(clip);}
    @Override public void onDropViewInstance(WallpaperTexture view){view.source(null);super.onDropViewInstance(view);}

    static final class WallpaperTexture extends TextureView implements TextureView.SurfaceTextureListener {
        private MediaPlayer player;
        private Uri uri;

        WallpaperTexture(Context context){
            super(context);
            setOpaque(false);
            setSurfaceTextureListener(this);
        }

        void source(String source){
            Uri candidate=VideoWallpaper.playbackUri(getContext(),source);
            close();
            uri=candidate;
            if(isAvailable())open(getSurfaceTexture());
        }

        private void open(SurfaceTexture texture){
            if(uri==null||texture==null||player!=null)return;
            MediaPlayer next=new MediaPlayer();
            player=next;
            Surface surface=new Surface(texture);
            try{
                next.setDataSource(getContext(),uri);
                next.setSurface(surface);
                next.setVolume(0f,0f);
                next.setLooping(true);
                next.setOnPreparedListener(value->{if(player==value){scale(value);value.start();}});
                next.setOnVideoSizeChangedListener((value,width,height)->{if(player==value)scale(value);});
                next.setOnErrorListener((value,what,extra)->{if(player==value)close();return true;});
                next.prepareAsync();
            }catch(Exception unavailable){close();}
            finally{surface.release();}
        }

        private void scale(MediaPlayer value){
            int width=getWidth(),height=getHeight(),videoWidth=value.getVideoWidth(),videoHeight=value.getVideoHeight();
            if(width<=0||height<=0||videoWidth<=0||videoHeight<=0)return;
            float view=(float)width/height,video=(float)videoWidth/videoHeight;
            Matrix matrix=new Matrix();
            matrix.setScale(Math.max(1,video/view),Math.max(1,view/video),width/2f,height/2f);
            setTransform(matrix);
        }

        private void close(){
            MediaPlayer current=player;
            player=null;
            if(current!=null)current.release();
        }

        @Override public void onSurfaceTextureAvailable(SurfaceTexture texture,int width,int height){open(texture);}
        @Override public void onSurfaceTextureSizeChanged(SurfaceTexture texture,int width,int height){if(player!=null)scale(player);}
        @Override public boolean onSurfaceTextureDestroyed(SurfaceTexture texture){close();return true;}
        @Override public void onSurfaceTextureUpdated(SurfaceTexture texture){}
        @Override protected void onAttachedToWindow(){super.onAttachedToWindow();if(isAvailable())open(getSurfaceTexture());}
        @Override protected void onDetachedFromWindow(){close();super.onDetachedFromWindow();}
    }
}
