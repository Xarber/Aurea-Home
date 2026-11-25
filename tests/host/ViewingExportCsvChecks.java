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
        System.out.println("Viewing export CSV checks passed");
    }
    private static void check(boolean value){if(!value)throw new AssertionError();}
}
