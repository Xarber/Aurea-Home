// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.io.*;
import java.net.*;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.RSAPublicKey;
import java.math.BigInteger;
import org.json.JSONObject;

/** Opt-in, loopback-only ADB. No caller-supplied shell, target, file or key code. */
final class LocalAdbController implements AutoCloseable {
    private static final String ALIAS="aurea.local-adb.v1";
    private final android.content.SharedPreferences prefs;
    private Socket socket;
    private String status="disabled";
    private int stream=0;
    LocalAdbController(Context context){prefs=context.getSharedPreferences("local-adb",0);if(enabled())status="disconnected";}
    boolean enabled(){return prefs.getBoolean("enabled",false);}
    synchronized JSONObject state(){try{return new JSONObject().put("enabled",enabled()).put("ready",socket!=null&&!socket.isClosed()).put("status",status);}catch(Exception ignored){return new JSONObject();}}
    synchronized JSONObject configure(boolean enable){prefs.edit().putBoolean("enabled",enable).apply();close();if(!enable){status="disabled";return state();}return connect();}
    private static int tag(String value){byte[] b=value.getBytes(StandardCharsets.US_ASCII);return (b[0]&255)|((b[1]&255)<<8)|((b[2]&255)<<16)|((b[3]&255)<<24);}
    private void send(String command,int arg0,int arg1,byte[] body)throws IOException{int checksum=0;for(byte b:body)checksum+=b&255;ByteBuffer header=ByteBuffer.allocate(24).order(ByteOrder.LITTLE_ENDIAN);int cmd=tag(command);header.putInt(cmd).putInt(arg0).putInt(arg1).putInt(body.length).putInt(checksum).putInt(cmd^0xffffffff);OutputStream out=socket.getOutputStream();out.write(header.array());out.write(body);out.flush();}
    private static final class Packet{int command,a,b;byte[] body;}
    private Packet receive()throws IOException{DataInputStream in=new DataInputStream(socket.getInputStream());byte[] bytes=new byte[24];in.readFully(bytes);ByteBuffer h=ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);Packet p=new Packet();p.command=h.getInt();p.a=h.getInt();p.b=h.getInt();int size=h.getInt(),sum=h.getInt(),magic=h.getInt();if(size<0||size>65536||magic!=(p.command^0xffffffff))throw new IOException("invalid_packet");p.body=new byte[size];in.readFully(p.body);int actual=0;for(byte b:p.body)actual+=b&255;if(actual!=sum)throw new IOException("checksum");return p;}
    private KeyStore identity()throws Exception{KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);if(!store.containsAlias(ALIAS)){KeyPairGenerator generator=KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA,"AndroidKeyStore");generator.initialize(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_SIGN).setKeySize(2048).setDigests(KeyProperties.DIGEST_NONE).setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1).build());generator.generateKeyPair();}return store;}
    private static byte[] little(BigInteger value,int size){byte[] out=new byte[size],big=value.toByteArray();for(int i=0;i<size&&i<big.length;i++)out[i]=big[big.length-i-1];return out;}
    private static byte[] publicKey(RSAPublicKey key){BigInteger n=key.getModulus(),base=BigInteger.ONE.shiftLeft(32);ByteBuffer data=ByteBuffer.allocate(524).order(ByteOrder.LITTLE_ENDIAN);data.putInt(64).putInt(n.modInverse(base).negate().intValue()).put(little(n,256)).put(little(BigInteger.ONE.shiftLeft(4096).mod(n),256)).putInt(key.getPublicExponent().intValue());return (android.util.Base64.encodeToString(data.array(),android.util.Base64.NO_WRAP)+" aurea@tv\0").getBytes(StandardCharsets.US_ASCII);}
    synchronized JSONObject connect(){
        if(!enabled())return SystemRemoteController.error("local_adb_disabled");
        if(socket!=null&&!socket.isClosed())return state();
        try{KeyStore store=identity();socket=new Socket();socket.connect(new InetSocketAddress("127.0.0.1",5555),2500);socket.setSoTimeout(8000);send("CNXN",0x01000000,4096,"host::aurea\0".getBytes(StandardCharsets.US_ASCII));boolean signed=false,published=false;
            for(int count=0;count<5;count++){Packet p=receive();if(p.command==tag("CNXN")){socket.setSoTimeout(3000);status="ready";return state();}if(p.command!=tag("AUTH")||p.a!=1||p.body.length!=20)throw new IOException("auth_protocol");if(!signed){Signature signature=Signature.getInstance("NONEwithRSA");signature.initSign((PrivateKey)store.getKey(ALIAS,null));byte[] prefix={0x30,0x21,0x30,0x09,0x06,0x05,0x2b,0x0e,0x03,0x02,0x1a,0x05,0x00,0x04,0x14};signature.update(prefix);signature.update(p.body);send("AUTH",2,0,signature.sign());signed=true;}else if(!published){send("AUTH",3,0,publicKey((RSAPublicKey)store.getCertificate(ALIAS).getPublicKey()));published=true;status="approval_required";}else throw new IOException("auth_rejected");}
        }catch(SocketTimeoutException pending){close();status="approval_required";return state();}catch(Exception failure){close();status="debugging_unavailable";return SystemRemoteController.error("local_adb_unavailable");}
        close();status="disconnected";return SystemRemoteController.error("local_adb_unavailable");
    }
    synchronized JSONObject key(String command){Integer code=keyCode(command);if(code==null)return SystemRemoteController.error("unsupported");if(socket==null||socket.isClosed()){if(status.equals("approval_required"))return SystemRemoteController.error("local_adb_authorization_required");JSONObject result=connect();if(!result.optBoolean("ready"))return SystemRemoteController.error("local_adb_authorization_required");}
        try{int local=++stream;send("OPEN",local,0,("shell:input keyevent "+code+"\0").getBytes(StandardCharsets.US_ASCII));int remote=0,received=0;for(int count=0;count<32;count++){Packet p=receive();if(p.b!=local)throw new IOException("stream");if(p.command==tag("OKAY")){remote=p.a;}else if(p.command==tag("WRTE")){received+=p.body.length;if(received>4096)throw new IOException("output_limit");send("OKAY",local,p.a,new byte[0]);}else if(p.command==tag("CLSE")){send("CLSE",local,p.a,new byte[0]);return new JSONObject().put("accepted",true).put("backend","local-adb");}else throw new IOException("protocol");}}catch(Exception failure){close();status="disconnected";return SystemRemoteController.error("local_adb_command_uncertain");}close();status="disconnected";return SystemRemoteController.error("local_adb_command_uncertain");
    }
    static Integer keyCode(String key){switch(key){case "up":return 19;case "down":return 20;case "left":return 21;case "right":return 22;case "ok":return 23;case "back":return 4;case "home":return 3;case "menu":return 82;case "volumeup":return 24;case "volumedown":return 25;case "mute":return 164;case "playpause":return 85;case "next":return 87;case "previous":return 88;case "rewind":return 89;case "fastforward":return 90;case "stop":return 86;case "channelup":return 166;case "channeldown":return 167;case "red":return 183;case "green":return 184;case "yellow":return 185;case "blue":return 186;case "power":return 26;default:return null;}}
    @Override public synchronized void close(){if(socket!=null)try{socket.close();}catch(IOException ignored){}socket=null;if(enabled())status="disconnected";}
}
