// SPDX-License-Identifier: AGPL-3.0-only
export function doorbellObservation(state:unknown,ring:unknown,previous:number|undefined,now:number){
  if(state==='unknown')return {stamp:previous??0,rang:false};
  if(typeof state!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(state))return undefined;
  const stamp=Date.parse(state);
  if(!Number.isFinite(stamp)||stamp>now+5000)return undefined;
  if(previous!==undefined&&stamp<=previous)return {stamp:previous,rang:false};
  return {stamp,rang:previous!==undefined&&ring===true&&stamp>=now-30000};
}
