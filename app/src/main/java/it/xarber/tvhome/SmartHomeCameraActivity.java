// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import java.util.concurrent.atomic.AtomicBoolean;

/** A private, foreground-only viewer. Frame bytes never pass through the remote or JS bridge. */
public final class SmartHomeCameraActivity extends Activity {
    private volatile boolean open;
    private ImageView image;
    private TextView status;
    private final AtomicBoolean pending=new AtomicBoolean();
    private long lastFrame;

    @Override protected void onCreate(Bundle saved){
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE|WindowManager.LayoutParams.FLAG_FULLSCREEN);
        FrameLayout root=new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        image=new ImageView(this);
        image.setScaleType(ImageView.ScaleType.FIT_CENTER);
        image.setContentDescription(AppLanguage.text(this,"Live camera"));
        root.addView(image,new FrameLayout.LayoutParams(-1,-1));
        status=new TextView(this);
        status.setTextColor(Color.WHITE);
        status.setTextSize(20);
        status.setGravity(Gravity.CENTER);
        status.setPadding(32,16,32,16);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        status.setText(AppLanguage.text(this,"Opening live camera…"));
        root.addView(status,new FrameLayout.LayoutParams(-1,-2,Gravity.CENTER));
        setContentView(root);
    }

    @Override protected void onResume(){
        super.onResume();
        String id=getIntent().getStringExtra("entity");
        if(isFinishing()||id==null||!HouseholdAccounts.get(this).activeId().equals("home")){
            finish();
            return;
        }
        open=true;
        Thread worker=new Thread(()->{
            try{new HomeAssistantControls(getApplicationContext()).viewCamera(id,()->open,this::frame);}
            catch(Exception unavailable){/* Report only the generic status in the foreground. */}
            if(open)runOnUiThread(()->{
                if(!open)return;
                clearImage();
                status.setText(AppLanguage.text(this,"Live camera unavailable. Press Back to return."));
                status.setVisibility(View.VISIBLE);
            });
        },"AureaCameraView");
        worker.start();
    }

    private void frame(byte[] bytes){
        long now=SystemClock.elapsedRealtime();
        if(now-lastFrame<100||!pending.compareAndSet(false,true))return;
        lastFrame=now;
        BitmapFactory.Options options=new BitmapFactory.Options();
        options.inJustDecodeBounds=true;
        BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);
        int edge=Math.max(options.outWidth,options.outHeight);
        if(options.outWidth<1||options.outHeight<1||edge>12000){pending.set(false);return;}
        options.inJustDecodeBounds=false;
        options.inSampleSize=1;
        while(edge/options.inSampleSize>1920)options.inSampleSize*=2;
        Bitmap next=BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);
        if(next==null){pending.set(false);return;}
        runOnUiThread(()->{
            try{
                if(!open){next.recycle();return;}
                image.setImageBitmap(next);
                status.setVisibility(View.GONE);
            }finally{pending.set(false);}
        });
    }

    private void clearImage(){
        image.setImageDrawable(null);
    }

    @Override protected void onPause(){
        open=false;
        clearImage();
        super.onPause();
        if(!isFinishing())finish();
    }
}
