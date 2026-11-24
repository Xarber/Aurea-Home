// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {Icon} from './Icon';
import {FocusButton} from './FocusButton';

type Title={id:string;title:string;show:string;positionMs?:number;durationMs?:number};
const inputStyle={color:'#fff',fontSize:17,minHeight:48,borderRadius:12,borderWidth:1,borderColor:'#919bad',paddingHorizontal:12};
export function PlexSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}){
  const profile=demo.prefs.householdProfile??'home';
  const [connected,setConnected]=useState<boolean>();
  const [titles,setTitles]=useState<Title[]>();
  const [server,setServer]=useState(''),[key,setKey]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const accept=(value:Record<string,unknown>)=>{
    if(typeof value.connected==='boolean')setConnected(value.connected);
    if(Array.isArray(value.entries))setTitles(value.entries as Title[]);
  };
  useEffect(()=>{
    let live=true;
    setBusy(true);
    void demo.execute('plexStatus',{profile}).then(value=>{
      if(!live)return;
      accept(value);
      if(value.connected===true)return demo.execute('plexList',{profile}).then(items=>{if(live)accept(items);});
    }).catch(()=>{if(live)setError(true);}).finally(()=>{if(live)setBusy(false);});
    return()=>{live=false;};
  },[demo.execute,profile]);
  async function run(op:string){
    setBusy(true);
    setError(false);
    try {
      const value=await demo.execute(op,{profile,...(op==='plexConnect'?{server,key:key.trim()}:{})});
      accept(value);
      if(op==='plexConnect'){setKey('');setServer('');}
      if(op==='plexDisconnect'){setTitles(undefined);setConfirm(false);}
    }catch{setError(true);}finally{setBusy(false);}
  }
  const row=(id:string,label:string,action:()=>void,disabled=false)=><FocusButton id={'plex-'+id}
    group="modal" label={t(label)} disabled={busy||disabled} onPress={action}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:8}}>
    <Icon name="film" size={21}/><Text style={{color:'#eef2ff',fontSize:17}}>{t(label)}</Text>
  </FocusButton>;
  return <View style={{gap:8,paddingVertical:8}}>
    {busy&&<Text accessibilityLiveRegion="polite" style={{color:'#d6e3ff'}}>{t('Connecting to Plex…')}</Text>}
    {error&&<Text accessibilityLiveRegion="polite" style={{color:'#f5d0dc'}}>{t('Plex could not complete the request. Check the app or server connection.')}</Text>}
    {connected===false&&<>
      <Text style={{color:'#d6e3ff',fontSize:16}}>{t('Read Continue Watching from a Plex server you trust. Use its HTTPS address and a Plex access token.')}</Text>
      <TextInput value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false}
        accessibilityLabel={t('Plex server HTTPS URL')} placeholder={t('Plex server HTTPS URL')}
        placeholderTextColor="#aeb9c9" maxLength={512} style={inputStyle}/>
      <TextInput value={key} onChangeText={setKey} secureTextEntry autoCapitalize="none" autoCorrect={false}
        accessibilityLabel={t('Plex access token')} placeholder={t('Plex access token')}
        placeholderTextColor="#aeb9c9" maxLength={256} style={inputStyle}/>
      {row('connect','Connect to Plex',()=>void run('plexConnect'),!server.trim()||!key.trim())}
    </>}
    {connected===true&&<>
      {row('open','Open Plex app',()=>void run('plexOpen'))}
      {titles?.length===0&&<Text style={{color:'#d6e3ff',fontSize:16}}>{t('Plex has no resumable titles.')}</Text>}
      {titles?.map(item=><View key={item.id} style={{paddingHorizontal:8,gap:3}}>
        <Text style={{fontSize:18,color:'#fff',fontWeight:'600'}}>{item.title}</Text>
        <Text style={{fontSize:15,color:'#cbd5e1'}}>{[item.show,item.durationMs&&typeof item.positionMs==='number'?
          Math.round(item.positionMs*100/item.durationMs)+'%':null].filter(Boolean).join(' · ')}</Text>
      </View>)}
      {row('reload','Refresh Plex list',()=>void run('plexList'))}
      {confirm?<>
        {row('confirm','Disconnect Plex from this profile',()=>void run('plexDisconnect'))}
        {row('cancel','Cancel',()=>setConfirm(false))}
      </>:row('disconnect','Disconnect Plex',()=>setConfirm(true))}
    </>}
  </View>;
}
