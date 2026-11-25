// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

public final class WatchHistoryChecks {
    public static void main(String[] args) {
        check(WatchHistoryPolicy.recordable(true,true,10000,60000));
        check(!WatchHistoryPolicy.recordable(false,true,10000,60000));
        check(!WatchHistoryPolicy.recordable(true,false,10000,60000));
        check(!WatchHistoryPolicy.recordable(true,true,9999,60000));
        check(!WatchHistoryPolicy.recordable(true,true,60000,60000));
        check(!WatchHistoryPolicy.recordable(true,true,10000,-1));
        check(WatchHistoryPolicy.retain(12,12));
        check(!WatchHistoryPolicy.retain(13,12));
        check(!WatchHistoryPolicy.retain(12,12+91L*24*60*60*1000));
        System.out.println("Watch history policy checks passed");
    }

    private static void check(boolean value){
        if(!value)throw new AssertionError();
    }
}
