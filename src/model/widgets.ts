// SPDX-License-Identifier: AGPL-3.0-only
type Base={id:string;label:string};
export type Widget=(Base&{type:'clock';zone:string})|(Base&{type:'timer'|'countdown';until:number})|(Base&{type:'note';body:string});

export function remainingTime(until:number,now:number) {
 const seconds=Math.max(0,Math.ceil((until-now)/1000));
 const hours=Math.floor(seconds/3600);
 const minutes=Math.floor(seconds/60)%60;
 const tail=String(seconds%60).padStart(2,'0');
 return hours>0?`${hours}:${String(minutes).padStart(2,'0')}:${tail}`:`${minutes}:${tail}`;
}

export function timerMinutes(value:string) {
 if(!/^\d{1,4}$/.test(value.trim()))return undefined;
 const minutes=Number(value);
 return minutes>=1&&minutes<=1440?minutes:undefined;
}

export function countdownDate(value:string,now:number) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return undefined;
 const [year,month,day]=value.split('-').map(Number);
 const date=new Date(year!,month!-1,day!);
 const today=new Date(now);today.setHours(0,0,0,0);
 if(date.getFullYear()!==year||date.getMonth()!==month!-1||date.getDate()!==day||
    date<today||year!>today.getFullYear()+20)return undefined;
 return value;
}

export function daysUntil(until:number,now:number) {
 const start=new Date(now),end=new Date(until);
 const localDate=(value:Date)=>Date.UTC(value.getFullYear(),value.getMonth(),value.getDate());
 return Math.max(0,Math.round((localDate(end)-localDate(start))/86400000));
}

export function parseWidgets(raw:unknown):Widget[] {
 if(!Array.isArray(raw))return [];
 return raw.slice(0,12).filter((widget):widget is Widget=>!!widget&&typeof widget.id==='string'&&
  typeof widget.label==='string'&&(
  widget.type==='clock'&&typeof widget.zone==='string'||
  widget.type==='note'&&typeof widget.body==='string'&&widget.body.length<=600||
  (widget.type==='timer'||widget.type==='countdown')&&typeof widget.until==='number'&&Number.isFinite(widget.until)));
}
