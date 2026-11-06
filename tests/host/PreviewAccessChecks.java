// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;
public class PreviewAccessChecks {
 public static void main(String[] args){String origin="https://aurea.xcenter.it",proof="server-only-random-proof";
  check(PreviewAccess.permits(true,true,true,origin,proof,proof));
  check(!PreviewAccess.permits(false,true,true,origin,proof,proof));
  check(!PreviewAccess.permits(true,false,true,origin,proof,proof));
  check(!PreviewAccess.permits(true,true,false,origin,proof,proof));
  check(!PreviewAccess.permits(true,true,true,"http://aurea.xcenter.it",proof,proof));
  check(!PreviewAccess.permits(true,true,true,origin,proof,"guessed"));
  check(PreviewAccess.alive(120000,0,119000));check(!PreviewAccess.alive(120001,0,120000));check(!PreviewAccess.alive(10000,0,0));check(!PreviewAccess.alive(0,10,0));
  System.out.println("PASS: preview rejects expired/revoked/cleartext/forged access and enforces bounded capture leases");
 }
 private static void check(boolean value){if(!value)throw new AssertionError("Preview privacy policy failed");}
}
