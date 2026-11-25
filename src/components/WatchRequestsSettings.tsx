// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';
import {focusId} from '../hooks/useKeyboard';

export function WatchRequestsSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}){
  const profile=demo.prefs.householdProfile??'home';
  type Request={id:string;title:string;startsAt?:number};
  type Match={id:string;source:string;episode?:string};
  const [selected,setSelected]=useState<Request>();
  const [matches,setMatches]=useState<Match[]>();
  const [list,setList]=useState<Request[]>();
  const [scheduled,setScheduled]=useState(false);
  const focusAfterAction=useRef<string>(undefined);
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const apply=(value:Record<string,unknown>)=>{
    setEnabled(value.enabled===true);
    setScheduled(value.scheduled===true);
    setList(Array.isArray(value.requests)?value.requests.filter(item=>typeof item?.id==='string'&&typeof item.title==='string'):[]);
  };
  async function update(operation:string,params:Record<string,unknown>={}){
    setBusy(true);setError(false);
    try{apply(await demo.execute(operation,{...params,profile}));}
    catch{setError(true);}finally{setBusy(false);}
  }
  useEffect(()=>{
    let mounted=true;
    void demo.execute('watchRequests',{profile}).then(value=>{if(mounted)apply(value);})
      .catch(()=>{if(mounted)setError(true);});
    return()=>{mounted=false;};
  },[demo.execute,profile]);
  useEffect(()=>{
    if(busy||!focusAfterAction.current)return;
    const target=focusAfterAction.current;
    focusAfterAction.current=undefined;
    const frame=requestAnimationFrame(()=>focusId('watch-req-'+target));
    return()=>cancelAnimationFrame(frame);
  },[busy,selected]);
  async function matching(request:Request){
    focusAfterAction.current="back";
    setSelected(request);setMatches(undefined);setBusy(true);setError(false);
    try{
      if(profile!=='home')return;
      const value=await demo.execute('watchRequestsMatch',{profile,id:request.id});
      setMatches(Array.isArray(value.entries)?value.entries.filter(item=>
        typeof item?.id==='string'&&typeof item.source==='string'):[]);
    }catch{setError(true);}finally{setBusy(false);}
  }
  async function open(program:string){
    if(!selected)return;
    setBusy(true);setError(false);
    try{
      await demo.execute('watchRequestsOpen',{profile,id:selected.id,program});
      demo.close();
    }catch{setError(true);}finally{setBusy(false);}
  }
  const chooseStart=(program:string)=>{
    if(!selected)return;
    void update('watchRequestsSchedule',{id:selected.id,program});
  };
  const startLabel=(time:number)=>new Date(time).toLocaleTimeString(demo.prefs.language,{hour:'2-digit',minute:'2-digit'});
  const scheduledStart=selected?.startsAt;
  const row=(id:string,label:string,press:()=>void)=><FocusButton key={id} id={'watch-req-'+id}
    group="modal" label={label} disabled={busy} onPress={press}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:9}}>
    <Icon name="film" size={20}/><Text style={{color:'#eff3ff',fontSize:17,flex:1}}>{label}</Text>
  </FocusButton>;
  return <View style={{gap:7}}>
    <Text style={{color:'#d6e3ff',fontSize:16}}>{t('Accept titles suggested by paired remotes for this profile.')}</Text>
    {error&&<Text accessibilityLiveRegion="polite" style={{color:'#fad3de'}}>{t('Watch requests are unavailable.')}</Text>}
    {!selected&&list&&row('enabled',t('Accept watch requests')+' · '+t(enabled?'On':'Off'),()=>void update('watchRequestsEnable',{enabled:!enabled}))}
    {scheduled&&row('cancel-start',t('Cancel scheduled start'),()=>void update('watchRequestsCancel'))}
    {!selected&&row('reload',t('Refresh requests'),()=>void update('watchRequests'))}
    {list?.length===0&&<Text style={{color:'#d6e3ff'}}>{t('No watch requests yet.')}</Text>}
    {!selected&&list?.slice().reverse().map(item=>row(item.id,item.title+(item.startsAt&&item.startsAt>Date.now()?' · '+startLabel(item.startsAt):''),()=>void matching(item)))}
    {selected&&<>
      <Text accessibilityRole="header" style={{color:'#fff',fontSize:19,fontWeight:'600'}}>{selected.title}</Text>
      {profile==='home'&&matches?.length===0&&<Text style={{color:'#d6e3ff'}}>{t('No matching program in Keep Watching.')}</Text>}
      {matches?.flatMap(match=>{
        const label=[match.source,match.episode].filter(Boolean).join(' · ');
        return [
          row(match.id,t('Open in app')+' · '+label,()=>void open(match.id)),
          ...(scheduledStart&&scheduledStart>Date.now()+2000?[row('schedule-'+match.id,
            t('Start at')+' '+startLabel(scheduledStart)+' · '+label,()=>chooseStart(match.id))]:[]),
        ];
      })}
      {row('dismiss',t('Dismiss'),()=>{focusAfterAction.current='reload';void update('watchRequestsDismiss',{id:selected.id});setSelected(undefined);})}
      {row('back',t('Back to watch requests'),()=>{focusAfterAction.current=selected.id;setSelected(undefined);setMatches(undefined);})}
    </>}
  </View>;
}
