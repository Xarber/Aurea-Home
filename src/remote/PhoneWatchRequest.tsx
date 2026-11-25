// SPDX-License-Identifier: AGPL-3.0-only
import React,{useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import type {RemoteClient} from './client';
import {FocusButton} from '../components/FocusButton';

export function PhoneWatchRequest({client}:{client:RemoteClient}){
  const [title,setTitle]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  async function send(){
    setBusy(true);setStatus('Sending…');
    try{await client.watchRequest(title.trim());setTitle('');setStatus('Sent to the active TV profile.');}
    catch(error){
      setStatus(error instanceof Error&&error.message==='watch_requests_disabled'?
        'Enable watch requests on the TV first.':'The TV could not receive this request.');
    }finally{setBusy(false);}
  }
  return <View style={{gap:10,paddingVertical:8}}>
    <TextInput accessibilityLabel="Title to suggest" value={title} onChangeText={setTitle} placeholder="Movie or series title"
      placeholderTextColor="#aeb9c9" maxLength={120} style={{color:'#fff',minHeight:48,paddingHorizontal:12,
        borderRadius:12,borderWidth:1,borderColor:'#919bad',fontSize:17}}/>
    <FocusButton id="phone-send-watch-request" group="phone-modal" label="Send request" disabled={busy||title.trim().length<2}
      onPress={()=>void send()} style={{minHeight:46,alignItems:'flex-start',paddingHorizontal:10}}>
      <Text style={{color:'#eff3ff',fontSize:17}}>Send request</Text>
    </FocusButton>
    {!!status&&<Text accessibilityLiveRegion="polite" style={{color:'#d6e3ff'}}>{status}</Text>}
  </View>;
}
