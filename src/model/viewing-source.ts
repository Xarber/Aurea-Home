// SPDX-License-Identifier: AGPL-3.0-only
export type ViewingSource={id:string;label:string};

export function viewingSources<Entry>(entries:readonly Entry[],source:(entry:Entry)=>ViewingSource,language:string) {
  const sources=new Map<string,ViewingSource>();
  for(const entry of entries){
    const item=source(entry);
    if(item.id&&item.label&&!sources.has(item.id))sources.set(item.id,item);
  }
  return [...sources.values()].sort((a,b)=>a.label.localeCompare(b.label,language)||a.id.localeCompare(b.id));
}

export function filterViewingEntries<Entry>(entries:readonly Entry[],source:(entry:Entry)=>ViewingSource,id?:string) {
  return id===undefined?entries:entries.filter(entry=>source(entry).id===id);
}
