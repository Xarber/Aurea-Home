// SPDX-License-Identifier: AGPL-3.0-only
export const idleDelays=[2,5,15,30] as const;
export const sleepCoverDelays=[0,15,30,60] as const;

export function sleepCoverDelay(minutes:unknown):number|undefined {
  const selected=sleepCoverDelays.find(delay=>delay===minutes);
  return selected===undefined?undefined:selected*60000;
}

export type IdleDisplayMode='off'|'dim'|'clock'|'black';

export function idleDelay(value:unknown) {
  return idleDelays.find(delay=>delay===value)??5;
}

export function idleMode(value:unknown):IdleDisplayMode {
  return value==='dim'||value==='clock'||value==='black'?value:'off';
}

/** A key used to wake the screen consumes repeats and its matching release. */
export class IdleWakeKey {
  private key?:string;

  handle(idle:boolean,key:string,phase:unknown):boolean {
    if(this.key===key){
      if(phase==='up')this.key=undefined;
      return true;
    }
    if(!idle)return false;
    if(phase==='down')this.key=key;
    return true;
  }

  reset(){this.key=undefined;}
}
