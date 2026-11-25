// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import type {RemoteClient} from './client';
import {parseHomeLayout} from './homeLayout';
import {wallpapers} from '../model/catalog';
import {FocusButton} from '../components/FocusButton';
import {Icon} from '../components/Icon';

export function PhoneHomeLayout({client}:{client:RemoteClient}){
  const [layout,setLayout]=useState<ReturnType<typeof parseHomeLayout>>();
  const [status,setStatus]=useState('Loading TV layout…');
  const [busy,setBusy]=useState(false);
  const [wallpaperMenu,setWallpaperMenu]=useState(false);
  const report=(failure:unknown)=>{
    const code=failure instanceof Error?failure.message:'';
    return code==='layout_access_disabled'?'Enable paired remote editing in Home layout on the TV.':
      code==='layout_changed'?'The layout changed on the TV. Reload it before editing.':'The TV layout is unavailable.';
  };
  useEffect(()=>{
    let mounted=true;
    void client.homeLayout().then(parseHomeLayout).then(value=>{
      if(mounted){setLayout(value);setStatus('');}
    }).catch(failure=>{if(mounted)setStatus(report(failure));});
    return()=>{mounted=false;};
  },[client]);
  async function change(payload:Record<string,unknown>={}){
    if(busy)return;
    setBusy(true);setStatus('Updating…');
    try{
      const value=parseHomeLayout(await client.homeLayout({...payload,revision:layout?.revision}));
      setLayout(value);setStatus(payload.action?'Saved on the TV.':'');
    }catch(failure){setStatus(report(failure));}
    finally{setBusy(false);}
  }
  const row=(id:string,label:string,press:()=>void,selected=false)=><FocusButton key={id} id={'phone-layout-'+id}
    group="phone-modal" label={label} selected={selected} disabled={busy} onPress={press}
    style={{minHeight:44,paddingHorizontal:10,alignItems:'flex-start'}}>
    <Text style={{color:'#eef2ff',fontSize:16}}>{label}</Text>
  </FocusButton>;
  return <View style={{gap:8,paddingVertical:8}}>
    {!!status&&<Text accessibilityLiveRegion="polite" style={{color:'#d6e3ff',fontSize:16}}>{status}</Text>}
    {row('reload','Reload layout',()=>void change())}
    {layout&&<>
      <Text accessibilityRole="header" style={{fontSize:18,fontWeight:'600',color:'#fff'}}>Dock</Text>
      {layout.dock.map((item,index)=><View key={item.id} style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:48}}>
        <Text style={{color:'#eef2ff',fontSize:16,flex:1,paddingHorizontal:8}}>{item.name}</Text>
        {([-1,1] as const).map(direction=>{
          const target=index+direction,other=layout.dock[target];
          if(item.id==='all'||!other||other.id==='all')return null;
          const label=(direction===-1?'Move earlier: ':'Move later: ')+item.name;
          return <FocusButton key={direction} id={'phone-layout-move-'+index+'-'+direction} group="phone-modal" label={label}
            disabled={busy} onPress={()=>void change({action:'swap',index,target})} style={{minWidth:44,minHeight:44}}>
            <Icon name={direction===-1?'previous':'next'} size={21}/>
          </FocusButton>;
        })}
      </View>)}
      {row('wallpaper','Built-in wallpaper · '+(wallpapers.find(item=>item.id===layout.wallpaper)?.name??layout.wallpaper),
        ()=>setWallpaperMenu(!wallpaperMenu))}
      {wallpaperMenu&&wallpapers.map(item=>row(item.id,item.name,()=>{
        if(item.id!==layout.wallpaper)void change({action:'wallpaper',wallpaper:item.id});
      },item.id===layout.wallpaper))}
    </>}
  </View>;
}
