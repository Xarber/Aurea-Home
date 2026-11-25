// SPDX-License-Identifier: AGPL-3.0-only
import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {tv} from '../platform/native/tv';
import {idleDelay,sleepCoverDelay,type IdleDisplayMode} from '../model/idle-display';

type Cover=Exclude<IdleDisplayMode,'off'>;
const foreground=()=>AppState.currentState!=='background'&&AppState.currentState!=='inactive';

export function useIdleDisplay(enabled:boolean,paused:boolean,mode:IdleDisplayMode,minutes:number) {
  const [cover,setCover]=useState<Cover>();
  const [scheduledMinutes,setScheduledMinutes]=useState<number>();
  const active=useRef<Cover>(undefined);
  const automatic=useRef<ReturnType<typeof setTimeout>>(undefined);
  const scheduled=useRef<ReturnType<typeof setTimeout>>(undefined);
  const show=useCallback((next?:Cover)=>{
    active.current=next;
    setCover(next);
  },[]);
  const startAutomatic=useCallback(()=>{
    clearTimeout(automatic.current);
    if(enabled&&!paused&&!active.current&&mode!=='off'&&foreground()){
      automatic.current=setTimeout(()=>show(mode),idleDelay(minutes)*60000);
    }
  },[enabled,paused,mode,minutes,show]);
  const wake=useCallback(()=>{
    const covered=!!active.current;
    if(covered)show();
    startAutomatic();
    return covered;
  },[startAutomatic,show]);
  const cancelSchedule=useCallback(()=>{
    clearTimeout(scheduled.current);
    setScheduledMinutes(undefined);
  },[]);
  const schedule=useCallback((minutes:number)=>{
    cancelSchedule();
    const delay=sleepCoverDelay(minutes);
    if(!enabled||delay===undefined||!foreground())return;
    const blank=()=>{
      cancelSchedule();
      clearTimeout(automatic.current);
      if(foreground())show('black');
    };
    if(delay===0)blank();
    else {
      setScheduledMinutes(minutes);
      scheduled.current=setTimeout(blank,delay);
    }
  },[cancelSchedule,enabled,show]);
  useEffect(()=>{
    startAutomatic();
    return()=>clearTimeout(automatic.current);
  },[startAutomatic]);
  useEffect(()=>{
    if(!enabled)return;
    const app=AppState.addEventListener('change',state=>{
      if(state==='background'||state==='inactive')cancelSchedule();
      wake();
    });
    const system=tv.subscribe(event=>{
      if(event.type==='home'||event.type==='home-resumed')wake();
    });
    return()=>{app.remove();system();};
  },[enabled,wake,cancelSchedule]);
  useEffect(()=>()=>{
    clearTimeout(scheduled.current);
  },[enabled]);
  return {idle:enabled&&!!cover,cover,wake,schedule,scheduledMinutes,cancelSchedule};
}
