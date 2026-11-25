// SPDX-License-Identifier: AGPL-3.0-only
import React,{useState} from 'react';
import {Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {clockMinute,quietHours,timeText} from '../model/quiet-hours';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';
import {TVTextInput} from './TVTextInput';

export function QuietHoursSettings({demo,t}:{demo:Launcher;t:(text:string)=>string}){
  const configured=demo.prefs.quietHours;
  const [start,setStart]=useState(()=>configured?timeText(configured.start):'22:00');
  const [end,setEnd]=useState(()=>configured?timeText(configured.end):'07:00');
  const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  const hours=quietHours({start:clockMinute(start),end:clockMinute(end)});
  const inputStyle={minHeight:48,borderColor:'#8e99ab',borderWidth:1,borderRadius:12,paddingHorizontal:12,color:'#fff',fontSize:16};
  async function save(next:typeof hours){
    setBusy(true);setError(false);
    try{
      await demo.execute('preferences',{quietHours:next});
      demo.back();
    }catch{setError(true);}finally{setBusy(false);}
  }
  const row=(id:string,label:string,action:()=>void,disabled=false)=><FocusButton id={'quiet-hours-'+id}
    label={t(label)} group="modal" disabled={disabled||busy} onPress={action}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:10}}>
    <Icon name="volume" size={20}/><Text style={{color:'#eef2ff',fontSize:17}}>{t(label)}</Text>
  </FocusButton>;
  return <View style={{gap:10,paddingVertical:8}}>
    <Text style={{color:'#d6e3ff',fontSize:16}}>{t('Mute Aurea’s navigation sounds during these hours. Use 24-hour local time.')}</Text>
    <TVTextInput id="quiet-hours-start" t={t} value={start} onChangeText={setStart} maxLength={5}
      placeholder="22:00" placeholderTextColor="#aeb9c9" accessibilityLabel={t('Quiet hours start')} style={inputStyle}/>
    <TVTextInput id="quiet-hours-end" t={t} value={end} onChangeText={setEnd} maxLength={5}
      placeholder="07:00" placeholderTextColor="#aeb9c9" accessibilityLabel={t('Quiet hours end')} style={inputStyle}/>
    {!hours&&<Text style={{color:'#d6e3ff',fontSize:15}}>{t('Enter two different times in HH:MM format.')}</Text>}
    {row('save','Save quiet hours',()=>void save(hours),!hours)}
    {configured&&row('disable','Turn off quiet hours',()=>void save(null))}
    {error&&<Text accessibilityLiveRegion="polite" style={{color:'#ffd4e0'}}>{t('Could not save quiet hours.')}</Text>}
  </View>;
}
