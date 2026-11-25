// SPDX-License-Identifier: AGPL-3.0-only
export type QuietHours={start:number;end:number};
const minute=(value:unknown):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<1440;

export function quietHours(value:unknown):QuietHours|null {
  if(!value||typeof value!=='object')return null;
  const {start,end}=value as Partial<QuietHours>;
  return minute(start)&&minute(end)&&start!==end?{start,end}:null;
}

export function clockMinute(text:string):number|undefined {
  const match=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(text.trim());
  return match?Number(match[1])*60+Number(match[2]):undefined;
}

export const timeText=(minutes:number)=>[Math.floor(minutes/60),minutes%60]
  .map(value=>String(value).padStart(2,'0')).join(':');
