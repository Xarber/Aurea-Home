// SPDX-License-Identifier: AGPL-3.0-only
type AppUsageEntry={label:string;minutes:number};
export type AppUsage={status:'permission'|'unavailable'}|{status:'ready';apps:AppUsageEntry[]};

export function appUsage(value:Record<string,unknown>):AppUsage {
 if(value.status==='permission')return {status:'permission'};
 if(value.status!=='ready'||!Array.isArray(value.apps))return {status:'unavailable'};
 const apps=value.apps.slice(0,12).flatMap((item:unknown):AppUsageEntry[]=>{
  if(!item||typeof item!=='object'||!('label' in item)||typeof item.label!=='string'||!item.label.trim()||
    !('minutes' in item)||typeof item.minutes!=='number'||!Number.isInteger(item.minutes)||
    item.minutes<1||item.minutes>1560)return [];
  return [{label:item.label,minutes:item.minutes}];
 });
 return {status:'ready',apps};
}
