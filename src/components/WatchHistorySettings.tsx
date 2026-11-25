// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

type RecordEntry={app:string;title:string;position:number;duration:number;observedAt:number};

export function WatchHistorySettings({demo,t}:{demo:Launcher;t:(value:string)=>string}) {
  const [apps,setApps]=useState<string[]>([]);
  const [records,setRecords]=useState<RecordEntry[]>([]);
  const [configure,setConfigure]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  function apply(value:Record<string,unknown>){
    setApps(Array.isArray(value.apps)?value.apps.filter((id):id is string=>typeof id==='string'):[]);
    setRecords(Array.isArray(value.records)?value.records.filter(item=>typeof item?.app==='string'&&typeof item.title==='string'
      &&Number.isFinite(item.position)&&Number.isFinite(item.duration)&&item.duration>0&&Number.isFinite(item.observedAt)):[]);
  }
  useEffect(()=>{
    let live=true;
    void demo.execute('localWatchHistory').then(value=>{if(live)apply(value);}).catch(()=>{if(live)setError(true);});
    return()=>{live=false;};
  },[demo.execute]);
  async function run(operation:string,data:Record<string,unknown>={}){
    setBusy(true);setError(false);
    try{apply(await demo.execute(operation,data));setConfirm(false);}
    catch{setError(true);}finally{setBusy(false);}
  }
  const text=(value:string)=><Text style={{fontSize:16,color:'#d6e3ff',paddingHorizontal:8}}>{t(value)}</Text>;
  const row=(id:string,label:string,click:()=>void,detail?:string)=><FocusButton key={id} id={'watch-history-'+id}
    group="modal" label={label} disabled={busy} onPress={click}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:10}}>
    <Icon name="film" size={22}/><View style={{flex:1,gap:4}}><Text style={{color:'#eef2ff',fontSize:17}}>{label}</Text>
    {!!detail&&<Text style={{color:'#c4d1e8',fontSize:15}}>{detail}</Text>}</View>
  </FocusButton>;
  return <View style={{gap:7,paddingVertical:8}}>
    {text('Choose video apps to remember progress on this profile. Recording uses Android notification access and runs while Aurea’s phone remote service is active.')}
    {error&&text('Local viewing history is unavailable.')}
    {!configure&&<>
      {row('choose',t('Choose video apps'),()=>setConfigure(true),apps.length?t('Enabled')+' · '+apps.length:t('Off'))}
      {row('permission',t('Android notification access'),()=>void demo.execute('mediaAccessSettings').catch(()=>setError(true)))}
      {records.length===0&&text('No local viewing history yet.')}
      {records.map(item=>row(item.app+':'+item.title,item.title,()=>{
        demo.close();
        void demo.execute('launch',{id:item.app}).catch(()=>{});
      },[demo.entry(item.app).id===item.app?demo.entry(item.app).name:item.app,
        Math.round(100*item.position/item.duration)+'%',new Date(item.observedAt).toLocaleDateString(demo.prefs.language)].join(' · ')))}
      {(apps.length>0||records.length>0)&&row('clear',t(confirm?'Confirm clear and stop recording':'Clear history and stop recording'),()=>{
        if(confirm)void run('localWatchHistoryClear');else setConfirm(true);
      })}
    </>}
    {configure&&<>
      {row('back',t('Back to history'),()=>setConfigure(false))}
      {demo.catalog.filter(item=>item.kind==='app').map(item=>{
        const enabled=apps.includes(item.id);
        return row(item.id,(enabled?'✓ ':'')+item.name,()=>void run('localWatchHistoryConfigure',{id:item.id,enabled:!enabled}));
      })}
    </>}
  </View>;
}
