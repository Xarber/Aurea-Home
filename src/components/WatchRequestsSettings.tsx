// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

export function WatchRequestsSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}){
  const profile=demo.prefs.householdProfile??'home';
  type Request={id:string;title:string};
  const [list,setList]=useState<Request[]>();
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const apply=(value:Record<string,unknown>)=>{
    setEnabled(value.enabled===true);
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
  const row=(id:string,label:string,press:()=>void)=><FocusButton key={id} id={'watch-req-'+id}
    group="modal" label={label} disabled={busy} onPress={press}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:9}}>
    <Icon name="film" size={20}/><Text style={{color:'#eff3ff',fontSize:17,flex:1}}>{label}</Text>
  </FocusButton>;
  return <View style={{gap:7}}>
    <Text style={{color:'#d6e3ff',fontSize:16}}>{t('Accept titles suggested by paired remotes for this profile.')}</Text>
    {error&&<Text accessibilityLiveRegion="polite" style={{color:'#fad3de'}}>{t('Watch requests are unavailable.')}</Text>}
    {list&&row('enabled',t('Accept watch requests')+' · '+t(enabled?'On':'Off'),()=>void update('watchRequestsEnable',{enabled:!enabled}))}
    {row('reload',t('Refresh requests'),()=>void update('watchRequests'))}
    {list?.length===0&&<Text style={{color:'#d6e3ff'}}>{t('No watch requests yet.')}</Text>}
    {list?.slice().reverse().map(item=>row(item.id,t('Dismiss')+' · '+item.title,()=>void update('watchRequestsDismiss',{id:item.id})))}
  </View>;
}
