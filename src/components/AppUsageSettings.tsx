// SPDX-License-Identifier: AGPL-3.0-only
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {appUsage,type AppUsage} from '../model/app-usage';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

export function AppUsageSettings({demo,t}:{demo:Launcher;t:(label:string)=>string}){
 const [data,setData]=useState<AppUsage>();
 const request=useRef(0);
 const read=useCallback(async()=>{
  const id=++request.current;
  try{
   const next=appUsage(await demo.execute('appUsageSummary'));
   if(request.current===id)setData(next);
  }catch{if(request.current===id)setData({status:'unavailable'});}
 },[demo.execute]);
 useEffect(()=>{
  void read();
  const subscription=AppState.addEventListener('change',state=>{if(state==='active')void read();});
  return()=>{request.current++;subscription.remove();};
 },[read]);
 const open=async()=>{
  try{await demo.execute('appUsageSettings');}
  catch{setData({status:'unavailable'});}
 };
 const missing=data?.status==='permission';
 const label=t(missing?'Open usage settings':'Refresh screen time');
 const minutes=new Intl.NumberFormat(demo.prefs.language,{style:'unit',unit:'minute',unitDisplay:'short'});
 return <View style={{gap:10,paddingVertical:4}}>
  <Text style={{color:'#dee8fc',fontSize:16,lineHeight:22}}>
   {t('Estimated time that each app was in the foreground today. Android reports totals for the entire TV.')}
  </Text>
  {missing&&<Text style={{color:'#f4f6ff',fontSize:16,lineHeight:22}}>
   {t('Allow usage access in Android settings to view this summary. The data stays on this TV.')}
  </Text>}
  <FocusButton id="tv-app-usage-action" group="modal" label={label} onPress={()=>void(missing?open():read())}
   style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:9}}>
   <Icon name={missing?'settings':'info'} size={18}/><Text style={{color:'#f4f6ff',fontSize:17}}>{label}</Text>
  </FocusButton>
  {data?.status==='unavailable'&&<Text accessibilityLiveRegion="polite" style={{color:'#dee8fc'}}>
   {t('Screen time is unavailable on this TV.')}
  </Text>}
  {data?.status==='ready'&&(data.apps.length?data.apps.map((entry,index)=>
   <View key={index} style={{flexDirection:'row',justifyContent:'space-between',gap:12,paddingHorizontal:6}}>
    <Text numberOfLines={2} style={{color:'#f4f6ff',fontSize:16,flex:1}}>{entry.label}</Text>
    <Text style={{color:'#dee8fc',fontSize:16}}>{minutes.format(entry.minutes)}</Text>
   </View>):<Text accessibilityLiveRegion="polite" style={{color:'#dee8fc'}}>{t('There is no reported app usage yet today.')}</Text>)}
 </View>;
}
