// SPDX-License-Identifier: AGPL-3.0-only
import React,{useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

export function ProfileFolderSettings({demo,t,launch,folderId,assignApp}:{
  demo:Launcher;t:(value:string)=>string;launch:(id:string)=>void;folderId?:string;assignApp?:string;
}){
  const [name,setName]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  const [manage,setManage]=useState(false),[confirm,setConfirm]=useState(false);
  const folders=demo.prefs.folders??[];
  const folder=folders.find(item=>item.id===folderId);
  const hidden=demo.prefs.hiddenApps??[];
  const visible=folder?.apps.filter(id=>!hidden.includes(id))??[];
  const [renaming,setRenaming]=useState(false);
  async function change(action:string,id?:string,app?:string){
    setBusy(true);
    setError(false);
    try{
      await demo.execute('folderChange',{profile:demo.prefs.householdProfile??'home',action,id,app,name});
      if(action==='delete')demo.back();
      if(action==='create'||action==='rename'){setName('');setRenaming(false);}
    }catch{setError(true);}finally{setBusy(false);}
  }
  const row=(id:string,label:string,action:()=>void,unavailable=false)=><FocusButton
    key={id} id={'folder-'+id} group="modal" label={label} disabled={busy||unavailable} onPress={action}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:8}}>
    <Icon name="apps" size={20}/><Text style={{color:'#eef2ff',fontSize:17,flex:1}}>{label}</Text>
  </FocusButton>;
  const field=<TextInput value={name} onChangeText={setName} maxLength={40}
    accessibilityLabel={t('Folder name')} placeholder={t('Folder name')} placeholderTextColor="#aeb9c9"
    style={{color:'#fff',minHeight:48,fontSize:17,paddingHorizontal:12,borderColor:'#919bad',borderWidth:1,borderRadius:12}}/>;
  return <View style={{gap:8,paddingVertical:7}}>
    {error&&<Text accessibilityLiveRegion="polite" style={{color:'#f4cfd8',fontSize:16}}>{t('The folder could not be updated.')}</Text>}
    {!!assignApp&&<>
      {folders.length===0&&<Text style={{color:'#d6e3ff'}}>{t('Create a folder before adding an app.')}</Text>}
      {folders.map(item=>{
        const contains=item.apps.includes(assignApp);
        return row(item.id,(contains?'✓ ':'')+item.name,()=>void change(contains?'remove':'add',item.id,assignApp));
      })}
    </>}
    {!folderId&&(!assignApp||folders.length===0)&&<>
      {!assignApp&&folders.map(item=>row(item.id,item.name,()=>demo.setPanel('folder:'+item.id)))}
      {folders.length<12&&<>{field}{row('create',t('Create folder'),()=>void change('create'),!name.trim())}</>}
    </>}
    {!!folder&&<>
      {!manage&&<>
        {!visible.length&&<Text style={{color:'#d6e3ff',fontSize:17}}>{t('This folder has no visible apps. Add apps from their menus.')}</Text>}
        {visible.map(id=>row(id,demo.entry(id).name,()=>{demo.close();launch(id);}))}
        {row('edit',t('Manage folder'),()=>setManage(true))}
      </>}
      {manage&&<>
        {renaming?<>{field}{row('save',t('Save name'),()=>void change('rename',folder.id),!name.trim())}</>:
          row('rename',t('Rename folder'),()=>{setName(folder.name);setRenaming(true);})}
        {folder.apps.map(id=>row('remove-'+id,t('Remove from folder')+' · '+demo.entry(id).name,
          ()=>void change('remove',folder.id,id)))}
        {confirm?<>{row('confirm',t('Delete this folder'),()=>void change('delete',folder.id))}
          {row('cancel',t('Cancel'),()=>setConfirm(false))}</>:
          row('delete',t('Delete folder'),()=>setConfirm(true))}
        {row('back',t('Back to folder'),()=>setManage(false))}
      </>}
    </>}
  </View>;
}
