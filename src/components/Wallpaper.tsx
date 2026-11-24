// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useId,useState} from 'react';
import {StyleSheet,View,AppState} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import Svg,{Path,Defs,LinearGradient as SvgGradient,Stop} from 'react-native-svg';
import Animated,{useSharedValue,useAnimatedStyle,withRepeat,withTiming,Easing,cancelAnimation,useReducedMotion} from 'react-native-reanimated';
import {usePaletteTransition} from '../hooks/usePaletteTransition';
import {fetchWeather,weatherAccent,weatherPhase,type WeatherCity,type WeatherObservation} from '../model/weather';
import {daylightPalette} from '../model/daylight';
import {wallpapers} from '../model/catalog';
export function Wallpaper({id,motion=false,mini=false,city}:{id:string;motion?:boolean;mini?:boolean;city?:WeatherCity|null}){
 const [active,setActive]=useState(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
 useEffect(()=>{const subscription=AppState.addEventListener('change',state=>setActive(state==='active'));return()=>subscription.remove();},[]);
 const wallpaper=wallpapers.find(w=>w.id===id)??wallpapers[0]!;const reduced=useReducedMotion();
 const drift=useSharedValue(0);
 useEffect(()=>{cancelAnimation(drift);drift.set(0);if(motion&&!reduced&&!mini&&active)drift.set(withRepeat(withTiming(1,{duration:10000,easing:Easing.inOut(Easing.sin)}),-1,true));return()=>cancelAnimation(drift);},[motion,reduced,mini,active]);
 const [now,setNow]=useState(Date.now);
 const [observation,setObservation]=useState<{place:string;value:WeatherObservation}>();
 const place=id==='daylight'&&!mini&&city?city.latitude+','+city.longitude:undefined;
 useEffect(()=>{
  if(!place||!city||!active)return;
  let timer:ReturnType<typeof setTimeout>;
  const lifetime=new AbortController();
  async function refresh(){
   const request=new AbortController();
   const abort=()=>request.abort();
   lifetime.signal.addEventListener('abort',abort,{once:true});
   const timeout=setTimeout(abort,8000);
   try{
    const value=await fetchWeather(city!,request.signal);
    if(value&&!lifetime.signal.aborted)setObservation({place:place!,value});
   }catch{/* Keep the last usable observation and fall back to the clock as it ages. */}
   finally{
    clearTimeout(timeout);
    lifetime.signal.removeEventListener('abort',abort);
    if(!lifetime.signal.aborted)timer=setTimeout(()=>void refresh(),30*60*1000);
   }
  }
  void refresh();
  return()=>{lifetime.abort();clearTimeout(timer);};
 },[place,active]);
 useEffect(()=>{
  if(id!=='daylight'||mini||!active)return;
  const update=()=>setNow(Date.now());
  update();
  const timer=setInterval(update,30000);
  return()=>clearInterval(timer);
 },[id,mini,active]);
 const reading=place&&observation?.place===place?observation.value:undefined;
 const hour=reading?weatherPhase(reading,now/1000):undefined;
 const clockPalette=id==='daylight'&&!mini?daylightPalette(hour??new Date(now).getHours()):wallpaper.colors;
 const accent=reading&&hour!==undefined?weatherAccent(reading.weatherCode):undefined;
 const palette=accent?[clockPalette[0],accent,clockPalette[2]] as const:clockPalette;
 const {layers,fade}=usePaletteTransition(palette,mini);
 const style=useAnimatedStyle(()=>({transform:[{translateX:drift.get()*28},{translateY:drift.get()*-16},{scale:1.3}]}));
 return <View testID={mini?undefined:'wallpaper-background'} style={[StyleSheet.absoluteFill,{overflow:'hidden',backgroundColor:palette[0]}]} pointerEvents="none">
 <View testID={!mini&&id==='classic'?'classic-wallpaper':undefined} style={[StyleSheet.absoluteFill,{opacity:1}]}><WallpaperScene colors={(mini?palette:layers.from) as [string,string,string]} style={style} motionId={mini?undefined:'wallpaper-motion'}/>
 {!mini&&<Animated.View testID="wallpaper-fade" style={[StyleSheet.absoluteFill,fade]}><WallpaperScene colors={layers.to as [string,string,string]} style={style}/></Animated.View>}

 </View></View>;
}
function WallpaperScene({colors,style,motionId}:{colors:readonly [string,string,string];style:object;motionId?:string}){
 const gradientId='wallpaper-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 return <View style={StyleSheet.absoluteFill} pointerEvents="none">
 <LinearGradient colors={colors} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}/>
 <Animated.View nativeID={motionId} style={[StyleSheet.absoluteFill,style]}>
 <Svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
 <Defs><SvgGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={colors[1]} stopOpacity="0.03"/><Stop offset="0.5" stopColor={colors[1]} stopOpacity="0.6"/><Stop offset="1" stopColor={colors[0]} stopOpacity="0.05"/></SvgGradient></Defs>
 <Path d="M-200 880 C80 830 240 470 430 100 C590-210 1030-190 1140 80 C920 130 640 320 490 570 C320 850 50 1050-200 1100Z" fill={`url(#${gradientId})`}/>
 <Path d="M440 1000 C600 760 620 520 930 410 C1100 350 1260 420 1570 180 L1600 950Z" fill={`url(#${gradientId})`} opacity="0.5"/>
 <Path d="M-100 850 C420 1070 700 230 1570 220" stroke={colors[1]} strokeWidth="1" opacity="0.24" fill="none"/>
 </Svg>
 </Animated.View>
 <LinearGradient colors={['transparent','rgba(3,7,15,0.18)','rgba(3,7,15,0.66)']} style={StyleSheet.absoluteFill}/>
 </View>;
}
