// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import java.io.ByteArrayOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.function.LongSupplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Bounded Content-Length framing for Home Assistant's MJPEG proxy. */
final class CameraFrames {
    private static final Pattern BOUNDARY=Pattern.compile(
        "(?:^|;)\\s*boundary\\s*=\\s*(?:\"([A-Za-z0-9_.-]{1,70})\"|([A-Za-z0-9_.-]{1,70}))(?:\\s*;|\\s*$)",
        Pattern.CASE_INSENSITIVE);
    private static final int MAX_FRAME=1024*1024;
    private final InputStream input;
    private final LongSupplier clock;
    private final String boundary,alternateBoundary;

    CameraFrames(InputStream input,String contentType,LongSupplier clock)throws IOException{
        if(contentType==null||!contentType.split(";",2)[0].trim().equalsIgnoreCase("multipart/x-mixed-replace"))
            throw new IOException("unsupported_camera_stream");
        Matcher match=BOUNDARY.matcher(contentType);
        if(!match.find())throw new IOException("invalid_camera_boundary");
        String advertised=match.group(1)==null?match.group(2):match.group(1);
        this.input=input;
        this.clock=clock;
        boundary="--"+advertised;
        // Home Assistant's own still stream may include its leading hyphens in the header.
        alternateBoundary=advertised.startsWith("--")?advertised:boundary;
    }

    byte[] read()throws IOException{
        long deadline=clock.getAsLong()+12000;
        String line=line(deadline);
        if(line!=null&&line.isEmpty())line=line(deadline);
        if(line==null||line.equals(boundary+"--")||line.equals(alternateBoundary+"--"))return null;
        if(!line.equals(boundary)&&!line.equals(alternateBoundary))throw new IOException("invalid_camera_boundary");
        int length=-1;
        boolean jpeg=false;
        for(int count=0;count<16;count++){
            String header=line(deadline);
            if(header==null)throw new EOFException();
            if(header.isEmpty()){
                if(!jpeg||length<4||length>MAX_FRAME)throw new IOException("invalid_camera_frame");
                byte[] image=new byte[length];
                for(int offset=0;offset<length;){
                    if(clock.getAsLong()>deadline)throw new IOException("camera_read_timeout");
                    int received=input.read(image,offset,length-offset);
                    if(received<1)throw new EOFException();
                    offset+=received;
                }
                if(image[0]!=(byte)0xff||image[1]!=(byte)0xd8||
                    image[length-2]!=(byte)0xff||image[length-1]!=(byte)0xd9)
                    throw new IOException("invalid_camera_frame");
                return image;
            }
            String[] pair=header.split(":",2);
            if(pair.length!=2)throw new IOException("invalid_camera_header");
            String value=pair[1].trim();
            switch(pair[0].trim().toLowerCase(Locale.ROOT)){
                case "content-type":jpeg=value.equalsIgnoreCase("image/jpeg");break;
                case "content-length":
                    if(length!=-1||!value.matches("[0-9]{1,7}"))throw new IOException("invalid_camera_length");
                    length=Integer.parseInt(value);
                    break;
                default:break;
            }
        }
        throw new IOException("too_many_camera_headers");
    }

    private String line(long deadline)throws IOException{
        ByteArrayOutputStream text=new ByteArrayOutputStream();
        for(int i=0;i<512;i++){
            if(clock.getAsLong()>deadline)throw new IOException("camera_read_timeout");
            int next=input.read();
            if(next<0){
                if(i==0)return null;
                throw new EOFException();
            }
            if(next=='\n'){
                byte[] bytes=text.toByteArray();
                int count=bytes.length;
                if(count>0&&bytes[count-1]=='\r')count--;
                return new String(bytes,0,count,StandardCharsets.US_ASCII);
            }
            text.write(next);
        }
        throw new IOException("camera_header_too_long");
    }
}
