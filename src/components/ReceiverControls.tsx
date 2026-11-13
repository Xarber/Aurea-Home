// SPDX-License-Identifier: AGPL-3.0-only
import {useRef, useState, type ComponentRef} from 'react';
import {Text, TextInput} from 'react-native';
import type {Launcher} from '../launcher/types';
import type {IconName} from '../model/catalog';

export function ReceiverControls({demo,t,row}:{
  demo:Launcher; t:(label:string)=>string;
  row:(label:string,icon:IconName,action:()=>void,value?:string)=>React.ReactNode;
}){
  const receiver=demo.snapshot?.receiver;
  const [editing,setEditing]=useState(false);
  const [name,setName]=useState('');
  const field=useRef<ComponentRef<typeof TextInput>>(null);
  if(!receiver)return null;
  function save(payload:Record<string,unknown>){
    void demo.execute('receiverSettings',payload).then(()=>setEditing(false)).catch(()=>{});
  }
  return <>
    {row('AirPlay receiver','airplay',()=>save({enabled:!receiver.enabled}),t(receiver.enabled?'On':'Off'))}
    {row('Receiver name','code',()=>{
      setName(receiver.customName);
      setEditing(true);
    },receiver.name)}
    {editing&&<>
      <Text style={{color:'#c2cad7'}}>{t('Leave blank to use the TV’s system name.')}</Text>
      <TextInput ref={field} value={name} onChangeText={setName} accessibilityLabel={t('Receiver name')}
        maxLength={63} style={{color:'#fff',backgroundColor:'#ffffff18',padding:14,borderRadius:12}}/>
      {row('Edit name','code',()=>field.current?.focus())}
      {row('Save name','check',()=>save({name}))}
      {row('Cancel','close',()=>setEditing(false))}
    </>}
  </>;
}
