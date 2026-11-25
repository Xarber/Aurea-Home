// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

final class CameraFramesChecks {
    private static final String HEADERS="Content-Type: image/jpeg\r\nContent-Length: 5\r\n\r\n";
    private static final byte[] IMAGE={(byte)255,(byte)216,42,(byte)255,(byte)217};

    public static void main(String[] args)throws Exception{
        ByteArrayOutputStream wire=new ByteArrayOutputStream();
        wire.write(("--frame\r\n"+HEADERS).getBytes(StandardCharsets.US_ASCII));
        wire.write(IMAGE);
        wire.write(("\r\n--frame\r\n"+HEADERS).getBytes(StandardCharsets.US_ASCII));
        wire.write(IMAGE);
        wire.write("\r\n--frame--\r\n".getBytes(StandardCharsets.US_ASCII));
        CameraFrames parser=new CameraFrames(new ByteArrayInputStream(wire.toByteArray()),
            "multipart/x-mixed-replace; boundary=\"--frame\"",()->0);
        if(!Arrays.equals(IMAGE,parser.read())||!Arrays.equals(IMAGE,parser.read())||parser.read()!=null)
            throw new AssertionError("Frames did not round-trip");

        rejected("text/html","--frame\r\n"+HEADERS);
        rejected("multipart/x-mixed-replace; boundary=frame","--other\r\n"+HEADERS);
        rejected("multipart/x-mixed-replace; boundary=frame","--frame\r\nContent-Length: 4\r\n"+HEADERS);
        rejected("multipart/x-mixed-replace; boundary=frame","--frame\r\n"+HEADERS.replace("5","1048577"));
        rejected("multipart/x-mixed-replace; boundary=frame","--frame\r\n"+HEADERS+"12345");
        rejected("multipart/x-mixed-replace; boundary=frame","--frame\r\n"+HEADERS+"123");
    }

    private static void rejected(String type,String text)throws Exception{
        try{
            new CameraFrames(new ByteArrayInputStream(text.getBytes(StandardCharsets.US_ASCII)),type,()->0).read();
        }catch(IOException invalid){return;}
        throw new AssertionError("Invalid frame accepted");
    }
}
