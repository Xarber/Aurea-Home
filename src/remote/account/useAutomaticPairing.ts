// SPDX-License-Identifier: AGPL-3.0-only
import {useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import {remoteAccountRequest} from './AccountSettings';
import {acceptInvitation,getInvitations,singleAutomaticInvitation} from './invitations';

export function useAutomaticPairing(enabled:boolean, idle:()=>boolean,
  pair:(peer:string,device:string,grant:string)=>Promise<void>) {
  const handlers=useRef({idle,pair});
  handlers.current={idle,pair};
  useEffect(()=>{
    if(!enabled)return;
    let timer:ReturnType<typeof setTimeout>;
    const controller=new AbortController();
    async function find() {
      if(!handlers.current.idle())return;
      try{
        if(AppState.currentState!=='background'&&(typeof document==='undefined'||!document.hidden)){
          const request=await remoteAccountRequest();
          if(request&&!controller.signal.aborted){
            const offer=singleAutomaticInvitation(await getInvitations(request,controller.signal));
            if(offer&&!controller.signal.aborted&&handlers.current.idle()){
              const {peer,device,grant}=await acceptInvitation(request,offer.peer,controller.signal);
              if(!controller.signal.aborted&&handlers.current.idle()){
                await handlers.current.pair(peer,device,grant);
                return;
              }
            }
          }
        }
      }catch{/* Local pairing remains available when an account or TV is unavailable. */}
      if(!controller.signal.aborted)timer=setTimeout(()=>void find(),12000);
    }
    void find();
    return()=>{controller.abort();clearTimeout(timer);};
  },[enabled]);
}
