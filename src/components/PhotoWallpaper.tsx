// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {AppState,Image,StyleSheet,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import Animated,{useReducedMotion} from 'react-native-reanimated';
import {photoIndex,photoIntervals} from '../model/photo-wallpapers';

export function PhotoWallpaper({photos,minutes}:{photos:string[];minutes:number}) {
  const [now,setNow]=useState(Date.now);
  const [visible,setVisible]=useState<string>();
  const [loaded,setLoaded]=useState<string>();
  const reduced=useReducedMotion();
  const interval=(photoIntervals.find(value=>value===minutes)??5)*60000;
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>;
    const update=()=>{
      clearTimeout(timer);
      if(AppState.currentState==='background'||AppState.currentState==='inactive')return;
      const current=Date.now();
      setNow(current);
      if(photos.length>1)timer=setTimeout(update,interval-current%interval+25);
    };
    update();
    const listener=AppState.addEventListener('change',update);
    return()=>{clearTimeout(timer);listener.remove();};
  },[interval,photos.length]);
  const photo=photos[photoIndex(photos.length,minutes,now)];
  const current=visible&&photos.includes(visible)?visible:undefined;
  useEffect(()=>{
    if(!photo||loaded!==photo||current===photo)return;
    const timer=setTimeout(()=>setVisible(photo),reduced?0:780);
    return()=>clearTimeout(timer);
  },[current,photo,loaded,reduced]);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {current&&<Image source={{uri:current}} resizeMode="cover" fadeDuration={0} style={StyleSheet.absoluteFill}/>}
    {photo&&current!==photo&&<Animated.View key={photo} style={[StyleSheet.absoluteFill,
      {opacity:loaded===photo?1:0,transitionProperty:'opacity',transitionDuration:reduced?0:750}]}>
      <Image source={{uri:photo}} resizeMode="cover" fadeDuration={0} style={StyleSheet.absoluteFill}
        onLoad={()=>setLoaded(photo)}/>
    </Animated.View>}
    {(current||photo===loaded)&&photo&&<LinearGradient pointerEvents="none" colors={['#07122455','transparent','#070d1b90']} style={StyleSheet.absoluteFill}/>}
  </View>;
}
