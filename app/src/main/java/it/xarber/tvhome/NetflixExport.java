// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import java.io.IOException;
import java.io.StringReader;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.ResolverStyle;
import java.time.temporal.ChronoField;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

final class NetflixExport {
    static final class ProfileRequired extends IOException {}
    @FunctionalInterface interface RecordConsumer {
        void write(String title,long time,boolean dateOnly)throws Exception;
    }

    private static final DateTimeFormatter DATE=DateTimeFormatter.ofPattern("M/d/uuuu",Locale.US).withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter SHORT_DATE=new DateTimeFormatterBuilder().appendPattern("M/d/")
        .appendValueReduced(ChronoField.YEAR,2,2,2000).toFormatter(Locale.US).withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter TIMESTAMP=DateTimeFormatter.ofPattern("M/d/uuuu H:mm[:ss]",Locale.US)
        .withResolverStyle(ResolverStyle.STRICT);
    private NetflixExport(){}

    static void read(String csv,String profile,RecordConsumer output)throws Exception{
        ViewingExportCsv reader=new ViewingExportCsv(new StringReader(csv));
        List<String> header=reader.row();
        if(header==null)throw new IOException("invalid_export_csv");
        Map<String,Integer> columns=new HashMap<>();
        for(int index=0;index<header.size();index++){
            String column=header.get(index).trim().toLowerCase(Locale.ROOT);
            if(columns.put(column,index)!=null)throw new IOException("duplicate_export_field");
        }
        Integer title=columns.get("title"),date=columns.get("date"),name=columns.get("profile name"),start=columns.get("start time");
        Integer supplemental=columns.get("supplemental video type");
        boolean detailed=name!=null&&start!=null;
        if(title==null||(!detailed&&(date==null||header.size()!=2)))throw new IOException("unsupported_netflix_export");
        if(detailed&&profile.isEmpty())throw new ProfileRequired();
        List<String> row;
        while((row=reader.row())!=null){
            if(row.size()!=header.size())continue;
            if(detailed&&(!profile.equals(row.get(name))||
                supplemental!=null&&!row.get(supplemental).trim().isEmpty()))continue;
            long time;
            try{
                if(detailed)time=timestamp(row.get(start).trim());
                else {
                    String value=row.get(date).trim();
                    DateTimeFormatter format=value.length()-value.lastIndexOf('/')==3?SHORT_DATE:DATE;
                    time=LocalDate.parse(value,format).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli();
                }
            }catch(DateTimeException invalid){continue;}
            output.write(row.get(title),time,!detailed);
        }
    }

    private static long timestamp(String value){
        String iso=value.replace(' ','T');
        try{return OffsetDateTime.parse(iso).toInstant().toEpochMilli();}catch(DateTimeException noOffset){}
        try{return LocalDateTime.parse(iso).toInstant(ZoneOffset.UTC).toEpochMilli();}catch(DateTimeException notIso){}
        return LocalDateTime.parse(value,TIMESTAMP).toInstant(ZoneOffset.UTC).toEpochMilli();
    }
}
