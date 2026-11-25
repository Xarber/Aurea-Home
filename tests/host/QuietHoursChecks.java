// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

final class QuietHoursChecks {
    public static void main(String[] args){
        check(QuietHours.active(1320,420,1320));
        check(QuietHours.active(1320,420,0));
        check(!QuietHours.active(1320,420,420));
        check(!QuietHours.active(1320,420,1319));
        check(QuietHours.active(600,660,600));
        check(!QuietHours.active(600,660,660));
        check(!QuietHours.active(600,600,600));
        check(!QuietHours.active(-1,660,610));
    }
    private static void check(boolean expected){
        if(!expected)throw new AssertionError("Quiet hours time window is incorrect");
    }
}
