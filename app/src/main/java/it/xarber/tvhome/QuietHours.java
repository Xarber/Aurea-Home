// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

final class QuietHours {
    private QuietHours() {}

    static boolean valid(int start,int end) {
        return start>=0&&start<1440&&end>=0&&end<1440&&start!=end;
    }

    static boolean active(int start,int end,int localMinute) {
        if(!valid(start,end)||localMinute<0||localMinute>=1440)return false;
        return start<end?localMinute>=start&&localMinute<end:localMinute>=start||localMinute<end;
    }
}
