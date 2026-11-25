// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

final class WatchHistoryPolicy {
    private static final long MAX_AGE=90L*24*60*60*1000;

    private WatchHistoryPolicy(){}

    static boolean recordable(boolean optedIn,boolean playing,long position,long duration){
        return optedIn&&playing&&duration>=60000&&position>=10000&&position<duration;
    }

    static boolean retain(long observed,long now){
        return observed>0&&observed<=now&&now-observed<=MAX_AGE;
    }
}
