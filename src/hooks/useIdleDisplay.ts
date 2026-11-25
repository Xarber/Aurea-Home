// SPDX-License-Identifier: AGPL-3.0-only
import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {tv} from '../platform/native/tv';
import {idleDelay,type IdleDisplayMode} from '../model/idle-display';

export function useIdleDisplay(available:boolean,mode:IdleDisplayMode,minutes:number) {
  const [idle,setIdle]=useState(false);
  const sleeping=useRef(false),timer=useRef<ReturnType<typeof setTimeout>>(undefined);
  const wake=useCallback(()=>{
    clearTimeout(timer.current);
    const wasSleeping=sleeping.current;
    sleeping.current=false;
    if(wasSleeping)setIdle(false);
    if(available&&mode!=='off'&&AppState.currentState!=='background'&&AppState.currentState!=='inactive'){
      timer.current=setTimeout(()=>{
        sleeping.current=true;
        setIdle(true);
      },idleDelay(minutes)*60000);
    }
    return wasSleeping;
  },[available,mode,minutes]);
  useEffect(()=>{
    wake();
    if(!available||mode==='off')return;
    const app=AppState.addEventListener('change',wake);
    const system=tv.subscribe(event=>{
      if(event.type==='home'||event.type==='home-resumed')wake();
    });
    return()=>{clearTimeout(timer.current);app.remove();system();};
  },[wake,available,mode]);
  return {idle:available&&mode!=='off'&&idle,wake};
}
