// SPDX-License-Identifier: AGPL-3.0-only
package it.xarber.tvhome;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.List;

/** Minimal RFC 4180 reader for Netflix exports. Preserves commas and newlines inside quotes. */
final class ViewingExportCsv {
    private final BufferedReader input;
    ViewingExportCsv(Reader reader){input=new BufferedReader(reader);}

    List<String> row()throws IOException {
        ArrayList<String> cells=new ArrayList<>();
        StringBuilder cell=new StringBuilder();
        boolean quoted=false,complete=false,seen=false;
        for(int next;(next=input.read())!=-1;){
            if(next=='\ufeff'&&!seen&&cells.isEmpty())continue;
            seen=true;
            if(quoted){
                if(next=='"'){
                    input.mark(1);
                    if(input.read()=='"')cell.append('"');
                    else {input.reset();quoted=false;complete=true;}
                }else cell.append((char)next);
            }else if(next==','||next=='\n'||next=='\r'){
                cells.add(cell.toString());
                if(cells.size()>36)throw new IOException("too_many_export_columns");
                cell.setLength(0);
                complete=false;
                if(next=='\n')return cells;
                if(next=='\r'){
                    input.mark(1);
                    if(input.read()!='\n')input.reset();
                    return cells;
                }
            }else if(next=='"'&&cell.length()==0&&!complete)quoted=true;
            else if(!complete&&next!='"')cell.append((char)next);
            else throw new IOException("invalid_export_csv");
            if(cell.length()>4096)throw new IOException("export_field_too_long");
        }
        if(quoted)throw new IOException("unfinished_export_csv");
        if(!seen)return null;
        cells.add(cell.toString());
        return cells;
    }
}
