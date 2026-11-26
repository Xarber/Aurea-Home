// SPDX-License-Identifier: AGPL-3.0-only
export type WatchNextProgram = {
  id:string; title:string; episode?:string; source:string; publisher?:string;
  positionMs?:number; durationMs?:number;
};

export function watchNextPrograms(value:Record<string,unknown>):WatchNextProgram[]|undefined {
  if(value.available!==true||!Array.isArray(value.entries))return undefined;
  const seen=new Set<string>();
  return value.entries.slice(0,100).filter((item):item is WatchNextProgram=>{
    if(typeof item?.id!=='string'||!item.id||seen.has(item.id)||
       typeof item.title!=='string'||!item.title.trim()||typeof item.source!=='string')return false;
    seen.add(item.id);
    return true;
  });
}

export function watchNextProgress({positionMs,durationMs}:WatchNextProgram){
  if(typeof positionMs!=='number'||typeof durationMs!=='number'||
     !Number.isFinite(positionMs)||!Number.isFinite(durationMs)||positionMs<0||durationMs<=0)return undefined;
  return Math.min(100,Math.round(100*positionMs/durationMs));
}
