// SPDX-License-Identifier: AGPL-3.0-only
import Svg,{Path} from 'react-native-svg';
import React,{useEffect,useRef,useState} from 'react';
import {Platform,StyleSheet} from 'react-native';
import Animated,{useAnimatedStyle,useReducedMotion,useSharedValue,withTiming} from 'react-native-reanimated';
import {PaletteGradient} from './PaletteGradient';
/** Wallpaper-only tint. Overscan covers rotated corners at TV and phone aspect ratios. */
export function MusicTint({enabled,playing,colors,dominance=.72}:{enabled:boolean;playing:boolean;colors:readonly[string,string];dominance?:number}){
 const reduced=useReducedMotion(),strength=.62,previous=useRef(enabled),opacity=useSharedValue(enabled&&playing?strength:0),[retained,setRetained]=useState(enabled);
 useEffect(()=>{const toggled=previous.current!==enabled;previous.current=enabled;opacity.set(withTiming(enabled&&playing?strength:0,{duration:reduced?0:toggled?1800:600}));if(enabled){setRetained(true);return;}const timer=setTimeout(()=>setRetained(false),reduced?0:1800);return()=>clearTimeout(timer);},[enabled,playing,reduced,strength]);
 const fade=useAnimatedStyle(()=>({opacity:opacity.get()}));
 return <Animated.View testID="music-wallpaper-tint" pointerEvents="none" style={[StyleSheet.absoluteFill,{overflow:'hidden'},fade]}>
 <Animated.View testID="music-wallpaper-drift" style={[StyleSheet.absoluteFill,{left:'-20%',right:'-20%',top:'-40%',bottom:'-40%',animationName:playing&&retained&&!reduced?{from:{transform:[{translateX:-28},{translateY:12},{rotate:'-8deg'},{scale:1.08}]},to:{transform:[{translateX:28},{translateY:-12},{rotate:'8deg'},{scale:1.16}]}}:undefined,animationDuration:14000,animationDirection:'alternate',animationIterationCount:'infinite'}]}><PaletteGradient colors={colors} dominance={dominance}/><Svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}><Path d="M-200 880 C80 830 240 470 430 100 C590-210 1030-190 1140 80 C920 130 640 320 490 570 C320 850 50 1050-200 1100Z" fill="black" opacity="0.12"/><Path d="M440 1000 C600 760 620 520 930 410 C1100 350 1260 420 1570 180 L1600 950Z" fill="white" opacity="0.12"/></Svg></Animated.View>
 </Animated.View>;
}
