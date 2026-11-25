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

export type DiscoveryTitle={id:number;kind:'tv'|'movie';title:string;year:string};
const keyFor=(item:DiscoveryTitle)=>item.kind+'-'+item.id;
const comparable=(value:string)=>value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();

export function exactDiscoveryTitle(titles:DiscoveryTitle[],query:string){
  const comparison=comparable(query);
  const exact=new Map(titles.filter(item=>comparable(item.title)===comparison).map(item=>[keyFor(item),item]));
  return exact.size===1?[...exact.values()][0]:undefined;
}

export function rankRelatedTitles(seeds:DiscoveryTitle[],related:DiscoveryTitle[][]){
  const known=new Set(seeds.map(keyFor));
  const scores=new Map<string,{item:DiscoveryTitle;score:number}>();
  for(const group of related){
    const seen=new Set<string>();
    group.forEach((item,index)=>{
      const key=keyFor(item);
      if(known.has(key)||seen.has(key))return;
      seen.add(key);
      const previous=scores.get(key)?.score??0;
      scores.set(key,{item,score:previous+1/(index+1)});
    });
  }
  return [...scores.values()].sort((a,b)=>b.score-a.score).slice(0,12).map(value=>value.item);
}
