// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageDecoder;
import android.net.Uri;
import android.os.Build;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Comparator;
import java.util.UUID;
import org.json.JSONArray;

/** Owns bounded, private copies of photos selected through Android's system picker. */
final class PhotoWallpapers {
    static final int MAX_PHOTOS=12;
    private static final int MAX_INPUT=24*1024*1024;
    private static final int MAX_EDGE=1920;
    private final Context context;

    private static PhotoWallpapers instance;

    static synchronized PhotoWallpapers get(Context context){
        if(instance==null)instance=new PhotoWallpapers(context.getApplicationContext());
        return instance;
    }

    private PhotoWallpapers(Context context){this.context=context;}

    private File directory(String profile){
        if(!profile.equals("home")&&!UUID.fromString(profile).toString().equals(profile))
            throw new IllegalArgumentException("invalid_profile");
        return new File(new File(context.getNoBackupFilesDir(),"wallpaper-photos"),profile);
    }

    JSONArray list(String profile){
        File[] photos=directory(profile).listFiles((dir,name)->name.matches("[a-f0-9-]{36}\\.jpg"));
        JSONArray items=new JSONArray();
        if(photos!=null){
            Arrays.sort(photos,Comparator.comparingLong(File::lastModified).thenComparing(File::getName));
            for(File photo:photos)items.put(Uri.fromFile(photo).toString());
        }
        return items;
    }

    synchronized int add(String profile,java.util.List<Uri> sources)throws Exception{
        File directory=directory(profile);
        if(!directory.isDirectory()&&!directory.mkdirs())throw new IllegalStateException("photo_storage_unavailable");
        int remaining=MAX_PHOTOS-list(profile).length(),added=0;
        for(Uri uri:sources){
            if(remaining<=0)break;
            if(!"content".equals(uri.getScheme()))continue;
            try{
                importPhoto(directory,uri);
                added++;
                remaining--;
            }catch(java.io.IOException|IllegalArgumentException invalid){
                // A failed selection never replaces an existing wallpaper.
            }
        }
        return added;
    }

    private void importPhoto(File directory,Uri uri)throws java.io.IOException{
        File input=File.createTempFile("incoming-",".tmp",context.getCacheDir());
        File output=null;
        Bitmap photo=null;
        try{
            try(InputStream source=context.getContentResolver().openInputStream(uri);
                FileOutputStream copy=new FileOutputStream(input)){
                if(source==null)throw new java.io.IOException("photo_unavailable");
                byte[] bytes=new byte[32768];
                int total=0,count;
                while((count=source.read(bytes))!=-1){
                    total+=count;
                    if(total>MAX_INPUT)throw new java.io.IOException("photo_too_large");
                    copy.write(bytes,0,count);
                }
            }
            if(Build.VERSION.SDK_INT>=28){
                photo=ImageDecoder.decodeBitmap(ImageDecoder.createSource(input),(decoder,info,source)->{
                    int w=info.getSize().getWidth(),h=info.getSize().getHeight();
                    if(w<1||h<1||Math.max(w,h)>24000)throw new IllegalArgumentException("photo_dimensions");
                    float scale=Math.min(1,MAX_EDGE/(float)Math.max(w,h));
                    decoder.setTargetSize(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));
                    decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
                });
            }else{
                BitmapFactory.Options options=new BitmapFactory.Options();
                options.inJustDecodeBounds=true;
                BitmapFactory.decodeFile(input.getPath(),options);
                int edge=Math.max(options.outWidth,options.outHeight);
                if(options.outWidth<1||options.outHeight<1||edge>24000)throw new java.io.IOException("photo_dimensions");
                options.inJustDecodeBounds=false;
                options.inSampleSize=1;
                while(edge/options.inSampleSize>MAX_EDGE)options.inSampleSize*=2;
                photo=BitmapFactory.decodeFile(input.getPath(),options);
            }
            if(photo==null)throw new java.io.IOException("invalid_photo");
            output=File.createTempFile("photo-",".tmp",directory);
            try(FileOutputStream jpeg=new FileOutputStream(output)){
                if(!photo.compress(Bitmap.CompressFormat.JPEG,88,jpeg))throw new java.io.IOException("photo_encode");
            }
            if(!output.renameTo(new File(directory,UUID.randomUUID()+".jpg")))throw new java.io.IOException("photo_save");
        }finally{
            if(photo!=null)photo.recycle();
            input.delete();
            if(output!=null)output.delete();
        }
    }

    synchronized void remove(String profile,String uri)throws Exception {
        File folder=directory(profile);
        Uri source=Uri.parse(uri);
        String name=source.getLastPathSegment();
        if(name==null||!name.matches("[a-f0-9-]{36}\\.jpg"))throw new IllegalArgumentException("unknown_photo");
        File photo=new File(folder,name);
        if(!Uri.fromFile(photo).toString().equals(uri)||!photo.isFile())throw new IllegalArgumentException("unknown_photo");
        if(!photo.delete())throw new IllegalStateException("photo_remove_failed");
    }
}
