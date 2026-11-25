// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useRef,useState} from 'react';
import {AppState,Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {suggestionRequest} from '../model/home-assistant';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';
import {TVTextInput} from './TVTextInput';

const field={color:'#fff',fontSize:17,minHeight:48,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:'#919bad'};

export function ViewingAssistantSettings({demo,t}:{demo:Launcher;t:(label:string)=>string}){
 const [entity,setEntity]=useState(''),[question,setQuestion]=useState('');
 const [answer,setAnswer]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const request=useRef(0);
 useEffect(()=>{
  const subscription=AppState.addEventListener('change',status=>{
   if(status==='active')return;
   request.current++;setQuestion('');setAnswer('');setBusy(false);setFailed(false);
  });
  return()=>{request.current++;subscription.remove();};
 },[]);
 const payload=suggestionRequest(entity,question);
 async function ask(){
  if(!payload||busy)return;
  const id=++request.current;
  setBusy(true);setFailed(false);setAnswer('');
  try{
   const next=await demo.execute('haGenerateSuggestion',payload);
   if(typeof next.answer!=='string'||!next.answer)throw new Error('answer_unavailable');
   if(request.current===id)setAnswer(next.answer);
  }catch{if(request.current===id)setFailed(true);}
  finally{if(request.current===id)setBusy(false);}
 }
 return <View style={{gap:8}}>
  <Text style={{color:'#dee8fc',fontSize:16,lineHeight:22}}>
   {t('Send a question to an AI Task on your Home Assistant server. Your hub may send the text to its configured provider.')}
  </Text>
  <TVTextInput id="viewing-ai-entity" t={t} accessibilityLabel={t('AI Task entity')}
   value={entity} onChangeText={setEntity} placeholder="ai_task.my_agent" placeholderTextColor="#aeb9c9"
   autoCapitalize="none" autoCorrect={false} maxLength={128} style={field}/>
  <TVTextInput id="viewing-ai-question" t={t} accessibilityLabel={t('What would you like to watch?')}
   value={question} onChangeText={setQuestion} placeholder={t('What would you like to watch?')} placeholderTextColor="#aeb9c9"
   maxLength={300} multiline style={field}/>
  <FocusButton id="viewing-ai-ask" group="modal" label={t('Ask for suggestions')} disabled={!payload||busy}
   onPress={()=>void ask()} style={{minHeight:48,flexDirection:'row',paddingHorizontal:10,gap:9}}>
   <Icon name="film" size={18}/><Text style={{color:'#f4f6ff',fontSize:17}}>{t('Ask for suggestions')}</Text>
  </FocusButton>
  {(busy||failed||!!answer)&&<Text accessibilityLiveRegion="polite" style={{color:'#f4f6ff',fontSize:16,lineHeight:24}}>
   {busy?t('Waiting for suggestions…'):failed?t('The assistant did not return a suggestion.'):
    t('AI-generated suggestions')+'\n'+answer}
  </Text>}
 </View>;
}
