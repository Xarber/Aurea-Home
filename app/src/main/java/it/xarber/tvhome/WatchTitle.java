// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import java.text.Normalizer;
import java.util.Locale;

final class WatchTitle {
    private WatchTitle(){}

    static boolean matches(String requested,String published){
        String title=normalized(requested);
        return !title.isEmpty()&&title.equals(normalized(published));
    }

    private static String normalized(String title){
        return Normalizer.normalize(title,Normalizer.Form.NFKC)
            .replaceAll("[\\p{Z}\\s]+"," ").trim().toLowerCase(Locale.ROOT);
    }
}
