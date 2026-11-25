// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {tv} from '../platform/native/tv';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';
import {ViewingSourceFilter} from './ViewingSourceFilter';
import {filterViewingEntries,viewingSources} from '../model/viewing-source';

type Entry={service:string;title:string;watched:number;video:string;dateOnly:boolean};

export function ViewingExportsSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}){
  const profile=demo.prefs.householdProfile??'home';
  const [entries,setEntries]=useState<Entry[]>([]);
  const [service,setService]=useState<string>();
  const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const apply=(result:Record<string,unknown>)=>{
    if(Array.isArray(result.entries))setEntries(result.entries.filter((item)=>
      typeof item?.title==='string'&&typeof item.service==='string'&&Number.isFinite(item.watched)));
  };
  useEffect(()=>{
    let live=true;
    const refresh=()=>{void tv.execute('viewingExports',{profile}).then(data=>{if(live)apply(data);})
      .catch(()=>{if(live)setError(true);});};
    const unsubscribe=tv.subscribe(event=>{if(event.type==='viewing-import')refresh();});
    refresh();
    return()=>{live=false;unsubscribe();};
  },[profile]);
  async function run(operation:string,entry?:Entry){
    setBusy(true);setError(false);
    try{
      const result=await demo.execute(operation,{profile,service:entry?.service,video:entry?.video});
      apply(result);
      setConfirm(false);
      if(operation==='viewingExportOpen')demo.close();
    }catch{setError(true);}finally{setBusy(false);}
  }
  const row=(id:string,label:string,press:()=>void,value?:string)=><FocusButton key={id} id={'viewing-export-'+id}
    group="modal" label={label} disabled={busy} onPress={press}
    style={{minHeight:46,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:10}}>
    <Icon name={value?'film':'settings'} size={20}/><View style={{flex:1,gap:4}}>
      <Text style={{color:'#eef2ff',fontSize:17}}>{label}</Text>
      {value&&<Text style={{color:'#c4d1e8',fontSize:15}}>{value}</Text>}
    </View>
  </FocusButton>;
  const source=(entry:Entry)=>({id:entry.service,label:entry.service});
  const sources=viewingSources(entries,source,demo.prefs.language);
  const sourceId=sources.find(item=>item.id===service)?.id;
  const visible=filterViewingEntries(entries,source,sourceId);
  return <View style={{gap:7,paddingVertical:8}}>
    <Text style={{color:'#d6e3ff',fontSize:16}}>{t('Import a Netflix profile CSV or YouTube Takeout watch-history JSON. Imported titles stay in this profile.')}</Text>
    {row('choose',t('Choose viewing export'),()=>void run('importViewingExport'))}
    {error&&<Text accessibilityLiveRegion="polite" style={{color:'#f5d0dc'}}>{t('The import or viewing action could not be completed.')}</Text>}
    {entries.length>0&&<>
      <ViewingSourceFilter id="viewing-exports-source" sources={sources} value={sourceId} onChange={setService} t={t}/>
      {row('clear',t(confirm?'Confirm clear imported history':'Clear imported history'),()=>{
        if(confirm)void run('clearViewingExports');else setConfirm(true);
      })}
      {visible.map((entry,index)=>row(entry.watched+'-'+index,entry.title,()=>void run('viewingExportOpen',entry),
        entry.service+' · '+new Date(entry.watched).toLocaleDateString(demo.prefs.language,entry.dateOnly?{timeZone:'UTC'}:undefined)))}
    </>}
  </View>;
}
