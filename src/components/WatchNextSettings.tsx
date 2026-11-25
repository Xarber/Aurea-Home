// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';
import {ViewingSourceFilter} from './ViewingSourceFilter';
import {filterViewingEntries,viewingSources} from '../model/viewing-source';

type Program={id:string;title:string;episode:string;source:string;publisher?:string;positionMs?:number;durationMs?:number};
const read=(value:Record<string,unknown>):Program[]|undefined=>value.available===true&&Array.isArray(value.entries)
  ?value.entries.filter(item=>typeof item?.id==='string'&&typeof item.title==='string'&&typeof item.source==='string')
  :undefined;

const programSource=(item:Program)=>({id:typeof item.publisher==='string'?item.publisher:item.source,label:item.source});

export function WatchNextSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}){
  const [items,setItems]=useState<Program[]>();
  const [loaded,setLoaded]=useState(false);
  const [failed,setFailed]=useState(false);
  const [editing,setEditing]=useState<Program>();
  const [source,setSource]=useState<string>();
  useEffect(()=>{
    let live=true;
    void demo.execute('watchNext').then(value=>{if(live)setItems(read(value));}).catch(()=>{})
      .finally(()=>{if(live)setLoaded(true);});
    return()=>{live=false;};
  },[demo.execute]);
  const row=(id:string,label:string,action:()=>void,detail?:string,progress?:number)=><FocusButton
    key={id} id={'watch-next-'+id} group="modal" label={label} onPress={action}
    style={{minHeight:54,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:12}}>
    <Icon name={detail?'film':'settings'} size={20}/>
    <View style={{flex:1,paddingVertical:6,gap:4}}>
      <Text style={{color:'#fff',fontSize:18,fontWeight:'600'}}>{label}</Text>
      {detail&&<Text style={{color:'#c4d1e8',fontSize:15}}>{detail}</Text>}
      {typeof progress==='number'&&<View accessibilityRole="progressbar" accessibilityValue={{now:progress,min:0,max:100}}
        style={{height:4,backgroundColor:'#ffffff30',borderRadius:2}}><View style={{width:progress+'%',height:4,backgroundColor:'#e6edff',borderRadius:2}}/></View>}
    </View>
  </FocusButton>;
  async function run(operation:string,id:string){
    setFailed(false);
    try{
      const result=await demo.execute(operation,{id});
      if(operation==='watchNextDismiss'){setItems(read(result));setEditing(undefined);}
      else if(result.accepted!==true)throw new Error('not_accepted');
    }catch{setFailed(true);}
  }
  const sources=viewingSources(items??[],programSource,demo.prefs.language);
  const sourceId=sources.find(item=>item.id===source)?.id;
  const visible=filterViewingEntries(items??[],programSource,sourceId);
  return <View style={{gap:8,paddingVertical:8}}>
    {!loaded||!items?.length?<Text accessibilityLiveRegion="polite" style={{color:'#d8e3f7',fontSize:17}}>
      {t(!loaded?'Looking for programs…':items?'No resumable programs are available.':'Android Watch Next is unavailable for this profile or TV.')}
    </Text>:editing?<>
      <Text accessibilityRole="header" style={{color:'#fff',fontWeight:'600',fontSize:19}}>{editing.title}</Text>
      {row('resume',t('Open in app'),()=>void run('watchNextOpen',editing.id))}
      {row('dismiss',t('Hide from Keep Watching'),()=>void run('watchNextDismiss',editing.id))}
      {row('return',t('Back to Keep Watching'),()=>setEditing(undefined))}
    </>:<>
      <ViewingSourceFilter id="keep-watching-source" sources={sources} value={sourceId} onChange={setSource} t={t}/>
      {visible.map(item=>row(item.id,item.title,()=>setEditing(item),
      [item.episode,item.source].filter(Boolean).join(' · '),
      item.durationMs&&typeof item.positionMs==='number'?Math.round(100*item.positionMs/item.durationMs):undefined))}
    </>}
    {failed&&<Text accessibilityLiveRegion="polite" style={{color:'#f7cbd7',fontSize:16}}>{t('This program could not be opened or updated.')}</Text>}
  </View>;
}
