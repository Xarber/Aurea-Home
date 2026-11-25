// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {AppState,Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {tv} from '../platform/native/tv';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';
import type {IconName} from '../model/catalog';

type Media={package:string;title:string;artist?:string;playing:boolean;canPlay:boolean;canPause:boolean;
 canPrevious:boolean;canNext:boolean;position?:number;duration?:number};

export function AndroidMediaSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}) {
  const [available,setAvailable]=useState<boolean>();
  const [items,setItems]=useState<Media[]>([]);
  const [selected,setSelected]=useState('');
  const [activityApp,setActivityApp]=useState('');
  const [error,setError]=useState(false);
  const [busy,setBusy]=useState(false);
  function apply(result:Record<string,unknown>){
    setAvailable(result.available===true);
    setActivityApp(typeof result.activityApp==='string'?result.activityApp:'');
    setItems(Array.isArray(result.sessions)?result.sessions.filter(item=>
      typeof item?.package==='string'&&typeof item.title==='string'):[]);
  }
  useEffect(()=>{
    let live=true;
    let timer:ReturnType<typeof setTimeout>;
    const refresh=async()=>{
      clearTimeout(timer);
      if(AppState.currentState==='background'||AppState.currentState==='inactive')return;
      try{
        const result=await tv.execute('mediaSessions');
        if(live)apply(result);
      }catch{if(live){setItems([]);setAvailable(false);}}
      if(live)timer=setTimeout(()=>void refresh(),5000);
    };
    const state=AppState.addEventListener('change',value=>{if(value==='active')void refresh();});
    void refresh();
    return()=>{live=false;clearTimeout(timer);state.remove();};
  },[]);
  async function action(operation:string,payload:Record<string,unknown>={}){
    setBusy(true);setError(false);
    try{
      const value=await demo.execute(operation,payload);
      if(operation!=='mediaAccessSettings')apply(value);
    }catch{setError(true);}finally{setBusy(false);}
  }
  const card=items.find(item=>item.package===selected);
  const row=(id:string,label:string,icon:IconName,press:()=>void,detail?:string)=><FocusButton key={id}
    id={'media-session-'+id} group="modal" label={label} disabled={busy} onPress={press}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:10}}>
    <Icon name={icon} size={22}/><View style={{flex:1,gap:4}}><Text style={{color:'#f0f4ff',fontSize:17}}>{label}</Text>
    {!!detail&&<Text style={{color:'#c4d1e8',fontSize:15}}>{detail}</Text>}</View>
  </FocusButton>;
  const body=(value:string)=><Text style={{color:'#d6e3ff',fontSize:16}}>{t(value)}</Text>;
  return <View style={{gap:8,paddingVertical:8}}>
    {error&&body('This Android media action is unavailable.')}
    {available===undefined&&body('Looking for Android media…')}
    {available===false&&<>
      {body('Enable notification access in Android to see and control active media apps. Aurea only reads media session details and does not read notification contents.')}
      {row('access',t('Open Android notification access'),'settings',()=>void action('mediaAccessSettings'))}
    </>}
    {available===true&&items.length===0&&body('No active Android media sessions.')}
    {!card&&activityApp&&row('activity-disable',t('Hide Android media from Home'),'close',
      ()=>void action('mediaActivityApp',{id:''}))}
    {!card&&items.map(item=>row(item.package,item.title,'music',()=>setSelected(item.package),item.artist||item.package))}
    {card&&<>
      <Text style={{color:'#fff',fontSize:22,fontWeight:'600'}}>{card.title}</Text>
      {!!card.artist&&body(card.artist)}
      {typeof card.position==='number'&&typeof card.duration==='number'&&card.duration>0&&
        body(t('Progress')+' · '+Math.round(card.position/card.duration*100)+'%')}
      {card.canPrevious&&row('previous',t('Previous'),'previous',()=>void action('mediaSessionCommand',{id:card.package,action:'previous'}))}
      {card.playing&&card.canPause&&row('pause',t('Pause'),'pause',()=>void action('mediaSessionCommand',{id:card.package,action:'pause'}))}
      {!card.playing&&card.canPlay&&row('play',t('Play'),'play',()=>void action('mediaSessionCommand',{id:card.package,action:'play'}))}
      {card.canNext&&row('next',t('Next'),'next',()=>void action('mediaSessionCommand',{id:card.package,action:'next'}))}
      {row('activity',t(activityApp===card.package?'Hide Android media from Home':'Show this app on Home'),'home',
        ()=>void action('mediaActivityApp',{id:activityApp===card.package?'':card.package}))}
      {row('back',t('Back to Android media'),'back',()=>setSelected(''))}
    </>}
  </View>;
}
