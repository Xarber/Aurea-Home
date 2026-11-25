// SPDX-License-Identifier: AGPL-3.0-only
type HistorySeed={title:string;date:number};

/** Prioritise recent eligible titles without fetching or exposing the history. */
export function discoveryHistory(records:unknown,imports:unknown):string[] {
  const candidates:HistorySeed[]=[];
  if(Array.isArray(records)){
    for(const record of records){
      if(typeof record?.title==='string'&&Number.isFinite(record.observedAt))
        candidates.push({title:record.title,date:record.observedAt});
    }
  }
  if(Array.isArray(imports)){
    for(const entry of imports){
      if(entry?.service==='Netflix'&&typeof entry.title==='string'&&Number.isFinite(entry.watched))
        candidates.push({title:entry.title,date:entry.watched});
    }
  }
  const titles=new Map<string,string>();
  for(const item of candidates.sort((a,b)=>b.date-a.date)){
    const title=item.title.trim();
    const key=title.normalize('NFKC').toLowerCase();
    if(title.length>=2&&title.length<=120&&!titles.has(key))titles.set(key,title);
    if(titles.size===8)break;
  }
  return [...titles.values()];
}
