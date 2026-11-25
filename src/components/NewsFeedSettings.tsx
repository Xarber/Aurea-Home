// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {Linking,Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {FocusButton} from './FocusButton';
import {TVTextInput} from './TVTextInput';
import {Icon} from './Icon';

type Headline={title:string;url?:string};

export function NewsFeedSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}){
  const profile=demo.prefs.householdProfile??'home';
  const [feed,setFeed]=useState(''),[draft,setDraft]=useState('');
  const [headlines,setHeadlines]=useState<Headline[]>();
  const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  useEffect(()=>{
    let live=true;
    void demo.execute('newsFeedStatus',{profile}).then(value=>{
      if(live&&typeof value.feed==='string'){setFeed(value.feed);setDraft(value.feed);}
    }).catch(()=>{if(live)setError(true);});
    return()=>{live=false;};
  },[demo.execute,profile]);
  async function run(operation:string,value?:string){
    setBusy(true);setError(false);
    try{
      const result=await demo.execute(operation,{feed:value,profile});
      if(typeof result.feed==='string'){setFeed(result.feed);setDraft(result.feed);setHeadlines(undefined);}
      if(Array.isArray(result.headlines))setHeadlines(result.headlines.filter(item=>
        typeof item?.title==='string'&&item.title.length<=200).slice(0,20));
    }catch{setError(true);}
    finally{setBusy(false);}
  }
  const row=(id:string,label:string,press:()=>void,disabled=false)=><FocusButton key={id}
    id={'headlines-'+id} group="modal" label={label} disabled={disabled||busy} onPress={press}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:8}}>
    <Icon name="film" size={20}/><Text style={{color:'#eef2ff',fontSize:17,flex:1}}>{label}</Text>
  </FocusButton>;
  return <View style={{gap:8}}>
    <Text style={{color:'#d6e3ff',fontSize:16}}>{t('Save an HTTPS RSS or Atom feed. Aurea contacts it only when you refresh headlines.')}</Text>
    <TVTextInput id="headlines-address" t={t} value={draft} onChangeText={setDraft} autoCapitalize="none" autoCorrect={false}
      maxLength={1024} placeholder={t('Feed URL')} accessibilityLabel={t('Feed URL')} placeholderTextColor="#aeb9c9"
      style={{minHeight:48,borderRadius:12,borderWidth:1,borderColor:'#919bad',color:'#fff',paddingHorizontal:12,fontSize:17}}/>
    {row('save',t('Save feed'),()=>void run('newsFeedSave',draft.trim()),draft.trim()===feed||!/^https:\/\//i.test(draft.trim()))}
    {!!feed&&row('refresh',t('Refresh headlines'),()=>void run('newsFeedRefresh'))}
    {!!feed&&row('remove',t('Clear feed address'),()=>void run('newsFeedSave',''))}
    {error&&<Text accessibilityLiveRegion="polite" style={{color:'#f3cbd7'}}>{t('The feed could not be read. Check its HTTPS address.')}</Text>}
    {headlines?.length===0&&<Text style={{color:'#d6e3ff'}}>{t('This feed has no headlines.')}</Text>}
    {headlines?.map((item,index)=>{
      const target=typeof item.url==='string'&&/^https:\/\//i.test(item.url)?item.url:undefined;
      return target?row(String(index),item.title,()=>void Linking.openURL(target).catch(()=>setError(true))):
        <Text key={index} style={{color:'#d6e3ff',fontSize:17,paddingHorizontal:10}}>{item.title}</Text>;
    })}
  </View>;
}
