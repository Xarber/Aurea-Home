// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

const platforms=[['homeassistant','Home Assistant'],['homebridge','Homebridge']] as const;
type PlatformId=typeof platforms[number][0];
export function SmartHomeSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}){
  const [status,setStatus]=useState<Record<string,unknown>>({});
  const [pending,setPending]=useState(false);
  const [error,setError]=useState(false);
  const [secret,setSecret]=useState<{platform:PlatformId;key:string}>();
  useEffect(()=>{
    let live=true;
    void demo.execute('automationStatus').then(value=>{if(live)setStatus(value);})
      .catch(()=>{if(live)setError(true);});
    return()=>{live=false;};
  },[demo.execute]);
  async function configure(platform:PlatformId,enabled:boolean) {
    setPending(true);
    setError(false);
    setSecret(undefined);
    try {
      const value=await demo.execute('automationConfigure',{platform,enabled});
      const {key,...rest}=value;
      setStatus(rest);
      if(enabled&&typeof key==='string')setSecret({platform,key});
    }catch{setError(true);}finally{setPending(false);}
  }
  const row=(id:string,label:string,action:()=>void)=><FocusButton id={id} group="modal" label={label}
    disabled={pending} onPress={action} style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',
      paddingHorizontal:10,gap:10}}><Icon name="settings" size={20}/><Text style={{color:'#eef2ff',fontSize:18}}>{label}</Text></FocusButton>;
  return <View style={{gap:10,marginVertical:10}}>
    <Text style={{color:'#d6e3ff',fontSize:17}}>{t('Connect a local hub to open Home, switch inputs and control volume.')}</Text>
    {typeof status.url==='string'&&<Text selectable style={{color:'#fff',fontSize:18}}>{status.url}</Text>}
    {platforms.map(([id,label])=><View key={id}>
      <Text accessibilityRole="header" style={{color:'#fff',fontWeight:'600',fontSize:18}}>{label}</Text>
      {status[id]===true?row('smart-revoke-'+id,t('Revoke integration key'),()=>void configure(id,false)):
        row('smart-create-'+id,t('Create integration key'),()=>void configure(id,true))}
      {secret?.platform===id&&<View style={{padding:10,gap:4}}>
        <Text style={{color:'#d6e3ff',fontSize:16}}>{t('Save this key in your hub. Aurea only shows it here once.')}</Text>
        <Text selectable accessibilityLabel={t('Integration key')} style={{color:'#fff',fontSize:18}}>{secret.key}</Text>
        {row('smart-hide-'+id,t('Hide key'),()=>setSecret(undefined))}
      </View>}
    </View>)}
    {error&&<Text accessibilityLiveRegion="polite" style={{color:'#f5dae4',fontSize:16}}>{t('Smart home settings are unavailable. Try again.')}</Text>}
  </View>;
}
