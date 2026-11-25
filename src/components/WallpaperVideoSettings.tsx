// SPDX-License-Identifier: AGPL-3.0-only
import React,{useState} from 'react';
import {Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

export function WallpaperVideoSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}) {
  const [open,setOpen]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const clip=demo.prefs.wallpaperVideo;
  async function action(operation:string){
    setBusy(true);
    try{await demo.execute(operation,{profile:demo.prefs.householdProfile??'home'});setConfirm(false);}
    catch{/* Launcher action feedback handles bridge errors. */}
    finally{setBusy(false);}
  }
  const row=(id:string,label:string,press:()=>void)=><FocusButton id={'wallpaper-video-'+id}
    group="modal" label={label} disabled={busy} onPress={press}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:8}}>
    <Icon name="film" size={20}/><Text style={{color:'#eef2ff',fontSize:16}}>{label}</Text>
  </FocusButton>;
  return <View style={{gap:5}}>
    {row('settings',t('Video wallpaper'),()=>setOpen(!open))}
    {open&&<>
      <Text style={{paddingHorizontal:8,color:'#d6e3ff',fontSize:15}}>
        {t('Import a private MP4 up to 30 seconds, 48 MB and 1080p. The video loops silently and takes priority on Home.')}
      </Text>
      {row('import',t(clip?'Replace video':'Import video'),()=>void action('importWallpaperVideo'))}
      {!!clip&&<>
        {row('enabled',t('Video wallpaper')+' · '+t(demo.prefs.wallpaperVideoEnabled?'On':'Off'),
          ()=>demo.change({wallpaperVideoEnabled:!demo.prefs.wallpaperVideoEnabled}))}
        {row('remove',t(confirm?'Confirm remove video':'Remove video'),()=>{
          if(confirm)void action('removeWallpaperVideo');else setConfirm(true);
        })}
      </>}
    </>}
  </View>;
}
