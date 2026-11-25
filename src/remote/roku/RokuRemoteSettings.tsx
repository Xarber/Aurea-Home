// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useRef,useState} from 'react';
import {AppState,Text,TextInput,View} from 'react-native';
import {fetch as nativeFetch} from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';
import {FocusButton} from '../../components/FocusButton';
import {Icon} from '../../components/Icon';
import type {IconName} from '../../model/catalog';
import type {RemoteKey} from '../types';
import {findRoku,rokuAddress,sendRokuKey,type RokuTarget} from './ecp';

const store='aurea.roku.remote.v1';
const request=(url:string,options:RequestInit)=>nativeFetch(url,options);
const textStyle={color:'#d6e3ff',fontSize:15};

export function RokuRemoteSettings(){
  const [address,setAddress]=useState('');
  const [target,setTarget]=useState<RokuTarget>();
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const operation=useRef<AbortController>(undefined);
  const mounted=useRef(true);
  useEffect(()=>{
    mounted.current=true;
    const lifecycle=AppState.addEventListener('change',state=>{if(state!=='active')operation.current?.abort();});
    void SecureStore.getItemAsync(store).then(value=>{
      if(!value||!mounted.current||operation.current)return;
      const entry=JSON.parse(value);
      if(typeof entry.address==='string'&&typeof entry.id==='string'&&typeof entry.name==='string'){
        setAddress(rokuAddress(entry.address));
        setTarget({address:entry.address,id:entry.id,name:entry.name,volume:entry.volume===true,power:entry.power===true});
      }
    }).catch(()=>{});
    return()=>{mounted.current=false;operation.current?.abort();lifecycle.remove();};
  },[]);
  const call=async(run:(signal:AbortSignal)=>Promise<void>,connecting=false)=>{
    if(operation.current)return;
    const active=new AbortController();
    const timeout=setTimeout(()=>active.abort(),5000);
    operation.current=active;
    setBusy(true);setStatus(connecting?'Checking Roku…':'');
    try{await run(active.signal);}
    catch(failure){
      if(!mounted.current)return;
      const code=failure instanceof Error?failure.message:'';
      setStatus(code==='roku_controls_disabled'?'On Roku, enable Control by mobile apps in Advanced system settings.':
        code==='device_changed'?'This IP address now belongs to a different Roku. Check the address in Settings.':
        'Could not control the Roku. Check its IP address and your Wi-Fi.');
    }finally{
      clearTimeout(timeout);operation.current=undefined;
      if(mounted.current)setBusy(false);
    }
  };
  const connect=()=>void call(async signal=>{
    const found=await findRoku(address,request,signal);
    if(signal.aborted||!mounted.current)return;
    await SecureStore.setItemAsync(store,JSON.stringify(found));
    if(mounted.current)setTarget(found);
  },true);
  const key=(command:RemoteKey,label:string,icon:IconName)=>button(command,label,icon,()=>target&&void call(signal=>
    sendRokuKey(target,command,request,signal)));
  const button=(id:string,label:string,icon:IconName,press:()=>void)=> <FocusButton id={'roku-'+id} key={id} group="phone-modal"
    label={label} disabled={busy} onPress={press} style={{minHeight:44,minWidth:44,paddingHorizontal:8,flexDirection:'row',gap:7}}>
    <Icon name={icon} size={19}/><Text style={{color:'#f2f5ff',fontSize:15}}>{label}</Text>
  </FocusButton>;
  const row=(children:React.ReactNode)=><View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8}}>{children}</View>;
  return <View style={{gap:10,paddingVertical:8}}>
    {!target?<>
      <Text style={textStyle}>Enter your Roku’s IP address from Settings → Network → About. Roku controls work over your home Wi-Fi.</Text>
      <TextInput accessibilityLabel="Roku IP address" placeholder="Roku IP address" placeholderTextColor="#aeb9c9"
        value={address} onChangeText={setAddress} autoCorrect={false} autoCapitalize="none" maxLength={48}
        style={{minHeight:48,color:'#fff',fontSize:17,paddingHorizontal:10,borderRadius:12,borderWidth:1,borderColor:'#919bad'}}/>
      {button('connect','Connect to Roku','tv',connect)}
    </>:<>
      <Text accessibilityRole="header" style={{color:'#f2f5ff',fontWeight:'600',fontSize:21}}>{target.name}</Text>
      {row(<>{key('up','Up','chevron')}</>)}
      {row(<>{key('left','Left','back')}{key('ok','Select','check')}{key('right','Right','chevron')}</>)}
      {row(<>{key('down','Down','chevron')}</>)}
      {row(<>{key('back','Back','back')}{key('home','Home','home')}{key('menu','Options','menu')}</>)}
      {row(<>{key('rewind','Rewind','previous')}{key('playpause','Play / Pause','playpause')}{key('fastforward','Forward','next')}</>)}
      {target.volume&&row(<>{key('volumedown','Volume down','volume')}{key('mute','Mute','volume')}{key('volumeup','Volume up','volume')}</>)}
      {target.power&&button('power','Turn off TV','tv',()=>void call(signal=>sendRokuKey(target,'power',request,signal)))}
      {button('change','Change Roku','settings',()=>{setAddress('');setTarget(undefined);})}
      {button('forget','Forget saved Roku','close',()=>void call(async signal=>{
        await SecureStore.deleteItemAsync(store);
        if(!signal.aborted&&mounted.current){setAddress('');setTarget(undefined);}
      }))}
    </>}
    {status&&<Text accessibilityLiveRegion="polite" style={textStyle}>{status}</Text>}
  </View>;
}
