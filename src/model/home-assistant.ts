// SPDX-License-Identifier: AGPL-3.0-only
export const isHomeEntity=(value:string)=>/^(light|switch|scene|climate|sensor|binary_sensor|camera)\.[a-z0-9_]{1,120}$/.test(value);

export function adjustedTemperature(state:Record<string,unknown>,direction:-1|1) {
  const {target,min,max}=state;
  const step=typeof state.step==='number'&&state.step>0?state.step:1;
  if(typeof target!=='number'||typeof min!=='number'||typeof max!=='number'||
    ![target,min,max,step].every(Number.isFinite)||min>max)return undefined;
  const next=Math.round(Math.max(min,Math.min(max,target+direction*step))*100)/100;
  return next===target?undefined:next;
}
