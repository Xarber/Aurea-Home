// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,Text,View} from 'react-native';
import {tv} from '../platform/native/tv';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';
import {TVTextInput} from './TVTextInput';

const inputStyle={minHeight:48,borderColor:'#8e99ab',borderWidth:1,borderRadius:12,paddingHorizontal:12,color:'#fff',fontSize:16};

export function GuestWifiSettings({t}:{t:(message:string)=>string}){
  const [ssid,setSsid]=useState(''),[password,setPassword]=useState('');
  const [secured,setSecured]=useState(true),[hidden,setHidden]=useState(false);
  const [image,setImage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const generation=useRef(0);
  useEffect(()=>{
    const clear=AppState.addEventListener('change',state=>{
      if(state==='active')return;
      ++generation.current;
      setSsid('');setPassword('');setImage('');setBusy(false);setError(false);
    });
    return()=>{++generation.current;clear.remove();};
  },[]);
  async function generate(){
    const attempt=++generation.current;
    setBusy(true);setError(false);
    try{
      const result=await tv.execute('guestWifiQr',{ssid,password,secured,hidden});
      if(attempt!==generation.current)return;
      if(typeof result.qr!=='string'||!result.qr.startsWith('data:image/png;base64,'))throw new Error();
      setImage(result.qr);setPassword('');
    }catch{
      if(attempt===generation.current)setError(true);
    }finally{
      if(attempt===generation.current)setBusy(false);
    }
  }
  const row=(id:string,label:string,press:()=>void,disabled=false)=><FocusButton
    id={'guest-wifi-'+id} label={t(label)} group="modal" onPress={press} disabled={disabled||busy}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:10}}>
    <Icon name="wifi" size={19}/>
    <Text style={{color:'#eef2ff',fontSize:17,flex:1}}>{t(label)}</Text>
  </FocusButton>;
  return <View style={{gap:10,paddingVertical:8}}>
    {image?<>
      <Text style={{fontSize:17,color:'#eef2ff',textAlign:'center'}}>{ssid}</Text>
      <Image style={{width:210,height:210,maxWidth:'100%',alignSelf:'center'}} resizeMode="contain"
        accessibilityLabel={t('Scan to join the guest Wi-Fi')} source={{uri:image,cache:'reload'}}/>
      {row('hide','Hide Wi-Fi code',()=>setImage(''))}
    </>:<>
      <Text style={{color:'#d6e3ff',fontSize:16}}>
        {t('Enter your guest network details to display a code. Anyone who can see the code can use it to join.')}
      </Text>
      <TVTextInput id="guest-wifi-network" t={t} accessibilityLabel={t('Network name')}
        placeholder={t('Network name')} placeholderTextColor="#aeb9c9" value={ssid} onChangeText={setSsid}
        autoCapitalize="none" autoCorrect={false} maxLength={32} editable={!busy} style={inputStyle}/>
      {row('security',secured?'Security: WPA/WPA2':'Security: Open',()=>{
        setSecured(!secured);setPassword('');
      })}
      {secured&&<TVTextInput id="guest-wifi-password" t={t} accessibilityLabel={t('Guest Wi-Fi password')}
        placeholder={t('Guest Wi-Fi password')} placeholderTextColor="#aeb9c9" value={password} onChangeText={setPassword}
        autoCapitalize="none" autoCorrect={false} maxLength={64} editable={!busy} secureTextEntry style={inputStyle}/>}
      {row('hidden',hidden?'Hidden network: On':'Hidden network: Off',()=>setHidden(!hidden))}
      {row('show','Show Wi-Fi code',()=>void generate(),!ssid||secured&&password.length<8)}
      {error&&<Text accessibilityLiveRegion="polite" style={{color:'#ffd4e0'}}>
        {t('Could not create a code. Check the network name and password.')}
      </Text>}
    </>}
  </View>;
}
