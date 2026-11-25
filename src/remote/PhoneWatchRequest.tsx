// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useRef,useState} from 'react';
import {AppState,Text,TextInput,View} from 'react-native';
import type {PairedTV} from './credentials';
import {FocusButton} from '../components/FocusButton';
import {Icon} from '../components/Icon';

export function PhoneWatchRequest({active,tvs,send}:{active?:string;tvs:PairedTV[];
  send:(address:string,title:string,signal:AbortSignal)=>Promise<void>}){
  const [title,setTitle]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const [destination,setDestination]=useState(active);
  const operation=useRef<AbortController>(undefined);
  useEffect(()=>{
    const subscription=AppState.addEventListener('change',state=>{if(state!=='active')operation.current?.abort();});
    return()=>{subscription.remove();operation.current?.abort();operation.current=undefined;};
  },[]);
  const available=tvs.filter(tv=>tv.address===active||!!tv.id);
  const selected=available.find(tv=>tv.address===destination)??available[0];
  async function submit(){
    if(!selected||operation.current)return;
    const controller=new AbortController();
    operation.current=controller;
    const timer=setTimeout(()=>controller.abort(),16000);
    setBusy(true);setStatus('Sending…');
    try{
      await send(selected.address,title.trim(),controller.signal);
      if(operation.current===controller){
        setTitle('');setStatus('Sent to the active profile on '+selected.name+'.');
      }
    }catch(error){
      if(operation.current===controller)setStatus(error instanceof Error&&error.message==='watch_requests_disabled'?
        'Enable watch requests on that TV first.':'The TV could not confirm receipt of this request.');
    }finally{
      clearTimeout(timer);
      if(operation.current===controller){operation.current=undefined;setBusy(false);}
    }
  }
  return <View style={{gap:10,paddingVertical:8}}>
    <TextInput accessibilityLabel="Title to suggest" value={title} onChangeText={setTitle} placeholder="Movie or series title"
      placeholderTextColor="#aeb9c9" maxLength={120} editable={!busy} style={{color:'#fff',minHeight:48,paddingHorizontal:12,
        borderRadius:12,borderWidth:1,borderColor:'#919bad',fontSize:17}}/>
    {(available.length>1||!!selected&&selected.address!==active)&&<View style={{gap:5}}>
      <Text accessibilityRole="header" style={{color:'#d6e3ff',fontSize:16}}>Send to</Text>
      {available.map((device,index)=><FocusButton key={device.address} id={'phone-watch-request-tv-'+index}
        group="phone-modal" label={device.name} disabled={busy} selected={device.address===selected?.address}
        onPress={()=>{setDestination(device.address);setStatus('');}}
        style={{minHeight:46,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:10}}>
        <Icon name={device.address===selected?.address?'check':'tv'} size={20}/>
        <Text style={{color:'#eff3ff',fontSize:17,flex:1}}>{device.name}</Text>
      </FocusButton>)}
    </View>}
    <FocusButton id="phone-send-watch-request" group="phone-modal" label="Send request"
      disabled={busy||!selected||title.trim().length<2}
      onPress={()=>void submit()} style={{minHeight:46,alignItems:'flex-start',paddingHorizontal:10}}>
      <Text style={{color:'#eff3ff',fontSize:17}}>Send request</Text>
    </FocusButton>
    {!!status&&<Text accessibilityLiveRegion="polite" style={{color:'#d6e3ff'}}>{status}</Text>}
  </View>;
}
