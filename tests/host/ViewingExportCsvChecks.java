// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

public final class ViewingExportCsvChecks {
    public static void main(String[] args)throws Exception {
        ViewingExportCsv reader=new ViewingExportCsv(new java.io.StringReader(
            "\ufeffTitle,Date\r\n\"Episode, Part \"\"Two\"\"\",11/23/26\r\n\"Multi\nline\",11/24/2026"));
        check(reader.row().equals(java.util.Arrays.asList("Title","Date")));
        check(reader.row().get(0).equals("Episode, Part \"Two\""));
        check(reader.row().get(0).equals("Multi\nline"));
        check(reader.row()==null);
        try{
            new ViewingExportCsv(new java.io.StringReader("\"unfinished")).row();
            throw new AssertionError("Malformed CSV was accepted");
        }catch(java.io.IOException expected){}
        java.util.List<String> retained=new java.util.ArrayList<>();
        String header="Profile Name,Start Time,Title,Supplemental Video Type";
        String csv=header+"\nAlice,2026-11-20 11:00:00,Arrival,\n"
            +"Bob,2026-11-21 12:00:00,Other title,\n"
            +"Alice,2026-11-22 14:00:00,Do not count,TRAILER\n"
            +"Alice,2026-11-23T18:00:00+01:00,Dune,\n"
            +"Alice,11/24/2026 8:00,New episode,\n"
            +"alice,11/25/2026 8:00,Another profile,";
        NetflixExport.read(csv,"Alice",(title,stamp,dateOnly)->{
            check(!dateOnly);
            retained.add(title+"@"+java.time.Instant.ofEpochMilli(stamp));
        });
        check(retained.equals(java.util.Arrays.asList("Arrival@2026-11-20T11:00:00Z","Dune@2026-11-23T17:00:00Z",
            "New episode@2026-11-24T08:00:00Z")));
        try{
            NetflixExport.read(csv,"",(title,stamp,dateOnly)->{throw new AssertionError("Household data mixed");});
            throw new AssertionError("An account-wide file needs a profile");
        }catch(NetflixExport.ProfileRequired expected){}
        NetflixExport.read("Title,Date\nArrival,11/23/26","",(title,stamp,dateOnly)->{
            check(dateOnly&&title.equals("Arrival"));
            check(java.time.Instant.ofEpochMilli(stamp).toString().equals("2026-11-23T00:00:00Z"));
        });
        String expected="2026-11-20T01:12:40Z";
        check(YouTubeTakeoutTime.parse("Nov 20, 2026, 1:12:40\u202fAM UTC")==java.time.Instant.parse(expected).toEpochMilli());
        check(YouTubeTakeoutTime.parse("Nov 20, 2026, 2:12:40 AM +01:00")==java.time.Instant.parse(expected).toEpochMilli());
        check(YouTubeTakeoutTime.parse("Nov 20, 2026, 2:12:40 AM")==null);
        System.out.println("Viewing export CSV checks passed");
    }
    private static void check(boolean value){if(!value)throw new AssertionError();}
}
