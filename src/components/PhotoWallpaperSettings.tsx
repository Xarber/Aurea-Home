// SPDX-License-Identifier: AGPL-3.0-only
import React,{useState} from 'react';
import {Image,Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {photoIntervals} from '../model/photo-wallpapers';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

export function PhotoWallpaperSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}) {
  const [expanded,setExpanded]=useState(false);
  const [removing,setRemoving]=useState<string>();
  const [busy,setBusy]=useState(false);
  const photos=demo.prefs.photoWallpapers??[];
  const profile=demo.prefs.householdProfile??'home';
  const minutes=demo.prefs.photoWallpaperMinutes??5;
  async function action(operation:string,uri?:string) {
    setBusy(true);
    try{await demo.execute(operation,{profile,uri});setRemoving(undefined);}
    catch{/* Failed operations use the launcher's existing action feedback. */}
    finally{setBusy(false);}
  }
  const row=(id:string,label:string,press:()=>void,uri?:string)=><FocusButton key={id} id={'photo-wallpaper-'+id}
    group="modal" label={label} disabled={busy} onPress={press}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',gap:10,paddingHorizontal:10}}>
    {uri?<Image source={{uri}} style={{width:58,height:36,borderRadius:6}}/>:<Icon name="wallpaper" size={20}/>}
    <Text style={{flex:1,color:'#eef2ff',fontSize:16}}>{label}</Text>
  </FocusButton>;
  return <View style={{gap:5}}>
    {row('settings',t('Personal photos')+(photos.length?' · '+photos.length:''),()=>setExpanded(!expanded))}
    {expanded&&<>
      <Text style={{paddingHorizontal:8,color:'#d6e3ff',fontSize:15}}>
        {t('Photos stay on this TV. When enabled, they take priority over scheduled wallpapers.')}
      </Text>
      {photos.length<12&&row('import',t('Import wallpaper photos'),()=>void action('importWallpaperPhotos'))}
      {!!photos.length&&<>
        {row('enabled',t('Photo rotation')+' · '+t(demo.prefs.photoWallpaperEnabled?'On':'Off'),
          ()=>demo.change({photoWallpaperEnabled:!demo.prefs.photoWallpaperEnabled}))}
        {photos.length>1&&row('duration',t('Time per photo')+' · '+minutes+' '+t('min'),()=>{
          const next=photoIntervals[(photoIntervals.findIndex(value=>value===minutes)+1)%photoIntervals.length]!;
          demo.change({photoWallpaperMinutes:next});
        })}
        {photos.map((uri,index)=>row(uri,(removing===uri?t('Confirm remove from Aurea'):t('Remove photo'))+' '+(index+1),()=>{
          if(removing===uri)void action('removeWallpaperPhoto',uri);
          else setRemoving(uri);
        },uri))}
      </>}
    </>}
  </View>;
}
