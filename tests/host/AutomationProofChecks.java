// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

public final class AutomationProofChecks {
    public static void main(String[] args)throws Exception {
        String key="Y2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2M";
        String nonce="Nzc3Nzc3Nzc3Nzc3Nzc3Nw";
        String epoch="eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
        String request="eyJhY3Rpb24iOiJzdGF0ZSJ9";
        String signing="MbugRkwgN3NsY34g91VgETV1ZqLztA2CBoui9ay4kzg";
        String response="Kke15vWh3dNDvqpD5CcmZF_A9j5dmq4q5r1YbQfiZfE";
        AutomationProof proof=new AutomationProof();
        check(!proof.claim(key,"homebridge",epoch,1000,nonce,request,signing,1031),"reject expired");
        check(!proof.claim(key,"homeassistant",epoch,1000,nonce,request,signing,1000),"reject another integration");
        check(!proof.claim(key,"homebridge",epoch,1000,nonce,request+"a",signing,1000),"reject changed action");
        check(!proof.claim(key,"homebridge","new-process",1000,nonce,request,signing,1000),"reject previous epoch");
        check(proof.claim(key,"homebridge",epoch,1000,nonce,request,signing,1000),"accept signed command");
        check(!proof.claim(key,"homebridge",epoch,1000,nonce,request,signing,1000),"reject replay");
        check(AutomationProof.response(key,"homebridge",nonce,"eyJzY2hlbWEiOjF9").equals(response),"verify response");
        System.out.println("Automation proof checks passed");
    }

    private static void check(boolean success,String label){
        if(!success)throw new AssertionError(label);
    }
}
