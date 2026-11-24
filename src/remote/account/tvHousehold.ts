// SPDX-License-Identifier: AGPL-3.0-only
import {useEffect, useState} from 'react';
import {AppState} from 'react-native';
import {tv} from '../../platform/native/tv';

export const tvAccountRoot = 'https://aurea.xcenter.it/account/';
export type TVAccount = {session:string;name?:string};
export type Household = {
  active:string;
  label:string;
  profiles:{id:string;label:string;linked:boolean}[];
  automatic:boolean;
  account?:TVAccount;
};

export async function tvAccountRequest(path:string, init?:RequestInit) {
  const response=await fetch(tvAccountRoot+path,{credentials:'omit',redirect:'error',cache:'no-store',...init});
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error(String(response.status));
  return response.json();
}

export function useTVHousehold(enabled:boolean,accountsEnabled:boolean) {
  const [household,setHousehold]=useState<Household>();
  useEffect(()=>{
    if(!enabled)return;
    let present=true;
    const read=()=>{
      void tv.execute('householdProfiles').then(value=>{
        if(present&&typeof value.active==='string'&&Array.isArray(value.profiles))setHousehold(value as Household);
      }).catch(()=>{});
    };
    read();
    const subscriber=AppState.addEventListener('change',state=>{if(state==='active')read();});
    return()=>{present=false;subscriber.remove();};
  },[enabled]);

  const profile=household?.active;
  const session=household?.account?.session;
  const automatic=household?.automatic;
  useEffect(()=>{
    if(!enabled||!accountsEnabled||!automatic||!profile||!session)return;
    const controller=new AbortController();
    let timer:ReturnType<typeof setTimeout>;
    const headers={Authorization:'Bearer '+session,'Content-Type':'application/json'};
    const publish=async()=>{
      try{
        if(AppState.currentState!=='background'){
          const offer=await tv.execute('accountInvite',{automatic:true,profile});
          if(!controller.signal.aborted&&typeof offer.grant==='string'){
            await tvAccountRequest('device/invitations',{method:'POST',headers,signal:controller.signal,
              body:JSON.stringify({peer:offer.peer,device:offer.device,grant:offer.grant,label:offer.label,automatic:true})});
          }
        }
      }catch(error){
        if(!controller.signal.aborted&&error instanceof Error&&['401','403'].includes(error.message)){
          const latest=await tv.execute('householdProfiles').catch(()=>null);
          if(latest?.active===profile&&(latest.account as TVAccount|undefined)?.session===session){
            const result=await tv.execute('householdSignOut',{id:profile}).catch(()=>null);
            if(!controller.signal.aborted&&result?.active)setHousehold(result as Household);
          }
          return;
        }
      }
      if(!controller.signal.aborted)timer=setTimeout(()=>void publish(),12000);
    };
    void publish();
    return()=>{clearTimeout(timer);controller.abort();};
  },[enabled,accountsEnabled,automatic,profile,session]);

  return {household,setHousehold};
}
