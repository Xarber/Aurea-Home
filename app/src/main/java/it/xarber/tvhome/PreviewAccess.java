// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
/** Transport proof and bounded lease policy independent of Android capture APIs. */
final class PreviewAccess {
 static boolean permits(boolean ticketValid,boolean parentTrusted,boolean loopback,String origin,String expected,String supplied){return ticketValid&&parentTrusted&&loopback&&"https://aurea.xcenter.it".equals(origin)&&expected!=null&&!expected.isEmpty()&&supplied!=null&&MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),supplied.getBytes(StandardCharsets.UTF_8));}
 static boolean alive(long now,long started,long lastPoll){return now>=started&&now>=lastPoll&&now-started<=120000&&now-lastPoll<=8000;}
 private PreviewAccess(){}
}
