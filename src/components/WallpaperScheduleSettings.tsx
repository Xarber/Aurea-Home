// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import {Text,View} from 'react-native';
import {phases} from '../model/daylight';
import {defaultWallpaperSchedule,wallpapers} from '../model/catalog';
import type {Preferences} from '../platform/preferences';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

const labels=['Dawn · 05:00','Day · 08:00','Dusk · 17:00','Night · 20:00'];
export function WallpaperScheduleSettings({prefs,change,t}:{
 prefs:Preferences;change:(value:Partial<Preferences>)=>void;t:(s:string)=>string;
}){
 const schedule=prefs.wallpaperSchedule??defaultWallpaperSchedule;
 const row=(id:string,label:string,value:string,activate:()=>void)=><FocusButton key={id} id={'wallpaper-schedule-'+id}
   group="modal" label={t(label)+' · '+t(value)} onPress={activate}
   style={{minHeight:46,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:10}}>
   <Icon name="wallpaper" size={20}/>
   <Text style={{color:'#eef2ff',fontSize:16,flex:1}}>{t(label)}</Text>
   <Text style={{color:'#c4d1e8',fontSize:15}}>{t(value)}</Text>
 </FocusButton>;
 return <View style={{gap:5,marginVertical:6}}>
   {row('enabled','Scheduled wallpapers',prefs.wallpaperScheduleEnabled?'On':'Off',
     ()=>change({wallpaperScheduleEnabled:!prefs.wallpaperScheduleEnabled}))}
   {prefs.wallpaperScheduleEnabled&&phases.map((phase,index)=>{
     const current=Math.max(0,wallpapers.findIndex(item=>item.id===schedule[phase]));
     return row(phase,labels[index]!,wallpapers[current]!.name,()=>{
       change({wallpaperSchedule:{...schedule,[phase]:wallpapers[(current+1)%wallpapers.length]!.id}});
     });
   })}
 </View>;
}
