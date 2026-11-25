// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useState} from 'react';
import {AppState,requireNativeComponent,StyleSheet,View,type ViewProps} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useReducedMotion} from 'react-native-reanimated';

const Texture=requireNativeComponent<ViewProps&{clip:string}>('AureaWallpaperVideo');

export function WallpaperVideo({clip}:{clip:string}) {
  const reduced=useReducedMotion();
  const [active,setActive]=useState(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
  useEffect(()=>{
    const subscription=AppState.addEventListener('change',state=>setActive(state==='active'));
    return()=>subscription.remove();
  },[]);
  if(!active||reduced)return null;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Texture clip={clip} style={StyleSheet.absoluteFill}/>
    <LinearGradient colors={['#07122455','transparent','#070d1b90']} style={StyleSheet.absoluteFill}/>
  </View>;
}
