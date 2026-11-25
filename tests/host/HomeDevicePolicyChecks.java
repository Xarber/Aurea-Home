// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

final class HomeDevicePolicyChecks {
    public static void main(String[] args) {
        check(HomeDevicePolicy.coverAction("blind",4,"set_cover_position"));
        check(HomeDevicePolicy.coverAction("curtain",10,"stop_cover"));
        check(!HomeDevicePolicy.coverAction("shade",4,"open_cover"));
        check(!HomeDevicePolicy.coverAction("garage",15,"open_cover"));
        check(!HomeDevicePolicy.coverAction("gate",15,"open_cover"));
        check(!HomeDevicePolicy.coverAction("window",15,"open_cover"));
        check(!HomeDevicePolicy.coverAction("blind",15,"unexpected"));
        check(HomeDevicePolicy.percentage(100,0)==100);
        check(HomeDevicePolicy.percentage(1,1)==1);
        invalid(101,0);
        invalid(0,1);
        invalid("40",0);
        invalid(40.1,0);
    }
    private static void check(boolean expected){
        if(!expected)throw new AssertionError("Incorrect device access policy");
    }
    private static void invalid(Object raw,int minimum){
        try{HomeDevicePolicy.percentage(raw,minimum);}
        catch(IllegalArgumentException rejected){return;}
        throw new AssertionError("Invalid device level accepted");
    }
}
