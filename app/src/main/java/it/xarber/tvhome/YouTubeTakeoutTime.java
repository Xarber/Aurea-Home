// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

final class YouTubeTakeoutTime {
    private static final DateTimeFormatter ENGLISH=DateTimeFormatter.ofPattern("MMM d, uuuu, h:mm:ss a XXX",Locale.ENGLISH);
    private YouTubeTakeoutTime(){}

    static Long parse(String value){
        String normalized=value.replace('\u202f',' ').replace('\u00a0',' ').trim();
        try{return Instant.parse(normalized).toEpochMilli();}
        catch(DateTimeException unavailable){}
        normalized=normalized.replaceFirst(" (?:GMT|UTC)$"," +00:00");
        try{return OffsetDateTime.parse(normalized,ENGLISH).toInstant().toEpochMilli();}
        catch(DateTimeException unavailable){return null;}
    }
}
