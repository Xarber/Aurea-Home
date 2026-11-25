// SPDX-License-Identifier: AGPL-3.0-only
export const isHomeEntity=(value:string)=>/^(light|switch|scene|climate|sensor|binary_sensor|camera|media_player|event|fan|cover|calendar)\.[a-z0-9_]{1,120}$/.test(value);

export function adjustedTemperature(state:Record<string,unknown>,direction:-1|1) {
  const {target,min,max}=state;
  const step=typeof state.step==='number'&&state.step>0?state.step:1;
  if(typeof target!=='number'||typeof min!=='number'||typeof max!=='number'||
    ![target,min,max,step].every(Number.isFinite)||min>max)return undefined;
  const next=Math.round(Math.max(min,Math.min(max,target+direction*step))*100)/100;
  return next===target?undefined:next;
}


export function adjustedVolume(volume:unknown,direction:-1|1) {
  if(typeof volume!=='number'||!Number.isFinite(volume)||volume<0||volume>1)return undefined;
  const next=Math.max(0,Math.min(1,Math.round((volume+direction*.05)*100)/100));
  return next===volume?undefined:next;
}

export function adjustedPercentage(raw:unknown,direction:-1|1,step:unknown=10,minimum=0){
  if(typeof raw!=='number'||!Number.isFinite(raw)||raw<minimum||raw>100)return undefined;
  const amount=typeof step==='number'&&Number.isFinite(step)&&step>=1&&step<=100?step:10;
  const next=Math.min(100,Math.max(minimum,Math.round(raw+amount*direction)));
  return next===raw?undefined:next;
}

export function calendarEventLabel(event:Record<string,unknown>,language:string){
  if(typeof event.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(event.date)){
    const date=new Date(event.date+'T00:00:00Z');
    if(Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===event.date)
      return date.toLocaleDateString(language,{day:'numeric',month:'short',timeZone:'UTC'});
  }
  if(typeof event.time==='number'&&Number.isFinite(event.time)){
    const date=new Date(event.time);
    if(Number.isFinite(date.valueOf()))return date.toLocaleString(language,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  return undefined;
}

export function suggestionRequest(entity:string,prompt:string){
  const id=entity.trim(),question=prompt.trim();
  return /^ai_task\.[a-z0-9_]{1,120}$/.test(id)&&question.length>=2&&question.length<=300
    ?{entity:id,prompt:question}:undefined;
}
