// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

final class WatchTitleChecks {
    public static void main(String[] args){
        check(WatchTitle.matches("  ARRIVAL ", "Arrival"));
        check(WatchTitle.matches("Ａｒｒｉｖａｌ","Arrival"));
        check(WatchTitle.matches("Dune   · Beginning","Dune · Beginning"));
        check(!WatchTitle.matches("Dune","Dune: Part Two"));
        check(!WatchTitle.matches("Dune · Beginning","Dune · Finale"));
        check(!WatchTitle.matches("",""));
    }
    private static void check(boolean expected){
        if(!expected)throw new AssertionError("Unsafe or missing watch request match");
    }
}
