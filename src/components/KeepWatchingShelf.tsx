// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {tv} from '../platform/native/tv';
import {watchNextPrograms,watchNextProgress,type WatchNextProgram} from '../model/watch-next';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

export function KeepWatchingShelf({demo,t,compact}:{demo:Launcher;t:(label:string)=>string;compact:boolean}){
  const [programs,setPrograms]=useState<WatchNextProgram[]>([]);
  const [opening,setOpening]=useState(false);
  useEffect(()=>{
    let active=true;
    let request=0;
    const refresh=()=>{
      const id=++request;
      void tv.execute('watchNext').then(value=>{
        if(active&&id===request)setPrograms(watchNextPrograms(value)??[]);
      }).catch(()=>{if(active&&id===request)setPrograms([]);});
    };
    refresh();
    const stop=tv.subscribe(event=>{if(event.type==='home-resumed')refresh();});
    return ()=>{active=false;stop();};
  },[demo.panel]);
  const open=(item:WatchNextProgram)=>{
    if(opening)return;
    setOpening(true);
    void demo.execute('watchNextOpen',{id:item.id}).finally(()=>setOpening(false)).catch(()=>{});
  };
  return <View style={styles.shelf}>
    <FocusButton id="keep-watching-shelf" group="page-0" label={t('Keep Watching')}
      style={styles.heading} onPress={()=>demo.setPanel('watchNext')}>
      <Icon name="film" size={18}/><Text accessibilityRole="header" style={styles.title}>{t('Keep Watching')}</Text>
      <Icon name="next" size={13}/>
    </FocusButton>
    {programs.length>0&&<View style={styles.cards}>
      {programs.slice(0,compact?2:4).map(item=>{
        const progress=watchNextProgress(item);
        return <FocusButton key={item.id} id={'keep-watching-'+item.id} group="page-0"
          label={[item.title,item.episode,item.source].filter(Boolean).join(' · ')} style={styles.card}
          onPress={()=>open(item)} onLongPress={()=>demo.setPanel('watchNext')}>
          <Text numberOfLines={1} style={styles.program}>{item.title}</Text>
          <Text numberOfLines={1} style={styles.detail}>{[item.episode,item.source].filter(Boolean).join(' · ')}</Text>
          {progress!==undefined&&<View accessibilityRole="progressbar" accessibilityValue={{now:progress,min:0,max:100}} style={styles.track}>
            <View style={[styles.progress,{width:progress+'%'}]}/>
          </View>}
        </FocusButton>;
      })}
    </View>}
  </View>;
}

const styles=StyleSheet.create({
  shelf:{gap:3,marginBottom:10},
  heading:{minHeight:44,alignSelf:'flex-start',paddingHorizontal:10,flexDirection:'row',gap:8,backgroundColor:'rgba(12,17,28,.82)'},
  title:{color:'#f4f6ff',fontSize:17,fontWeight:'600'},
  cards:{flexDirection:'row',gap:9},
  card:{flex:1,minWidth:0,alignItems:'stretch',gap:4,paddingHorizontal:11,paddingVertical:7,
    borderRadius:12,backgroundColor:'rgba(12,17,28,.82)'},
  program:{color:'#f4f6ff',fontSize:16,fontWeight:'600'},
  detail:{color:'#c4d1e8',fontSize:12},
  track:{height:3,borderRadius:2,backgroundColor:'#ffffff35'},
  progress:{height:3,borderRadius:2,backgroundColor:'#e6edff'},
});
