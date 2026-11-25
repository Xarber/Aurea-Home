// SPDX-License-Identifier: AGPL-3.0-only
import React,{useState} from 'react';
import {Text,View} from 'react-native';
import {focusId} from '../hooks/useKeyboard';
import type {ViewingSource} from '../model/viewing-source';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

export function ViewingSourceFilter({id,sources,value,onChange,t}:{
  id:string;sources:ViewingSource[];value?:string;onChange:(value?:string)=>void;t:(value:string)=>string;
}){
  const [expanded,setExpanded]=useState(false);
  const selected=sources.find(source=>source.id===value);
  if(sources.length<2&&!selected)return null;
  const all=t('All apps');
  const filter=t('Filter by app');
  const select=(next?:string)=>{
    onChange(next);
    focusId(id);
    setExpanded(false);
  };
  const choices=[{id:undefined,label:all},...sources];
  return <View style={{gap:5}}>
    <FocusButton id={id} group="modal" label={filter+' · '+(selected?.label??all)} onPress={()=>setExpanded(open=>!open)}
      style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',gap:10,paddingHorizontal:10}}>
      <Icon name="apps" size={20}/>
      <Text style={{color:'#eef2ff',fontSize:17,flex:1}}>{filter}</Text>
      <Text style={{color:'#c4d1e8',fontSize:15,flexShrink:1}}>{selected?.label??all}</Text>
    </FocusButton>
    {expanded&&choices.map((source,index)=><FocusButton key={source.id??''} id={id+'-'+index}
      group="modal" label={source.label} selected={source.id===selected?.id} onPress={()=>select(source.id)}
      style={{minHeight:44,flexDirection:'row',justifyContent:'flex-start',gap:10,paddingHorizontal:16}}>
      <Icon name={source.id===selected?.id?'check':'apps'} size={18}/>
      <Text style={{color:'#eef2ff',fontSize:16,flex:1}}>{source.label}</Text>
    </FocusButton>)}
  </View>;
}
