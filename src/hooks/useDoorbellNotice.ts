// SPDX-License-Identifier: AGPL-3.0-only
import {useEffect} from 'react';
import {AppState} from 'react-native';
import {tv} from '../platform/native/tv';
import {doorbellObservation} from '../model/doorbell';

export function useDoorbellNotice(entity:string|undefined,onRing:()=>void) {
  useEffect(()=>{
    if(!entity)return;
    let generation=0,baseline:number|undefined,timer:ReturnType<typeof setTimeout>|undefined;
    const stop=()=>{
      ++generation;
      baseline=undefined;
      clearTimeout(timer);
    };
    const poll=async(attempt:number)=>{
      try{
        const reply=await tv.execute('haDoorbellPoll',{id:entity});
        if(attempt!==generation)return;
        const observed=doorbellObservation(reply.state,reply.ring,baseline,Date.now());
        if(observed){
          baseline=observed.stamp;
          if(observed.rang)onRing();
        }
      }catch{/* Keep the last observation so reconnects do not repeat earlier alerts. */}
      if(attempt===generation)timer=setTimeout(()=>void poll(attempt),10000);
    };
    const active=()=>{
      stop();
      void poll(generation);
    };
    const subscription=AppState.addEventListener('change',state=>{
      if(state==='active')active();
      else stop();
    });
    if(AppState.currentState==='active'||AppState.currentState===null)active();
    return()=>{stop();subscription.remove();};
  },[entity,onRing]);
}
