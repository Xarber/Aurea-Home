// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useRef,useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import {findWeatherCities,type WeatherCity} from '../model/weather';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

export function WallpaperWeatherSettings({city,change,language,t}:{
  city?:WeatherCity|null;change:(city:WeatherCity|null)=>void;language:string;t:(text:string)=>string;
}) {
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [results,setResults]=useState<WeatherCity[]>([]);
  const [state,setState]=useState<'idle'|'loading'|'empty'|'error'>('idle');
  const request=useRef<AbortController>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  async function search(){
    if(query.trim().length<2)return;
    request.current?.abort();
    const active=new AbortController();
    request.current=active;
    const timeout=setTimeout(()=>active.abort(),8000);
    setState('loading');
    setResults([]);
    try {
      const next=await findWeatherCities(query.trim(),language,active.signal);
      if(request.current===active){setResults(next);setState(next.length?'idle':'empty');}
    } catch {
      if(request.current===active)setState('error');
    } finally {clearTimeout(timeout);}
  }
  const row=(id:string,label:string,onPress:()=>void,disabled=false)=><FocusButton
    key={id} id={id} group="modal" label={label} onPress={onPress} disabled={disabled}
    style={{minHeight:46,alignItems:'flex-start',paddingHorizontal:10}}>
    <Text style={{color:'#eef2ff',fontSize:16}}>{label}</Text>
  </FocusButton>;
  return <View style={{gap:6,marginVertical:6}}>
    <FocusButton id="weather-settings" group="modal" label={t('Daylight weather')} onPress={()=>setOpen(!open)}
      style={{minHeight:46,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:8}}>
      <Icon name="sun" size={22}/>
      <Text style={{color:'#eef2ff',fontSize:16,flex:1}}>{t('Daylight weather')}{city?' · '+city.label:''}</Text>
    </FocusButton>
    {open&&<>
      <Text style={{color:'#cbd5e1',fontSize:15}}>{t('Choose a city for sunrise, sunset and weather colors. City searches and forecasts use Open-Meteo.')}</Text>
      <TextInput accessibilityLabel={t('City name')} placeholder={t('City name')} placeholderTextColor="#aeb9c9"
        maxLength={100} value={query} onChangeText={setQuery} onSubmitEditing={()=>void search()}
        style={{color:'#fff',fontSize:17,minHeight:48,borderRadius:12,borderWidth:1,borderColor:'#919bad',paddingHorizontal:12}}/>
      {row('weather-search',t('Search cities'),()=>void search(),query.trim().length<2||state==='loading')}
      {state!=='idle'&&<Text accessibilityLiveRegion="polite" style={{color:'#e3ebff',fontSize:15}}>{t(
        state==='loading'?'Searching cities…':state==='empty'?'No cities found.':'Weather search is unavailable. Try again.'
      )}</Text>}
      {results.map((value,index)=>row('weather-city-'+index,value.label,()=>{
        change(value);setResults([]);setQuery('');setOpen(false);
      }))}
      {city&&row('weather-off',t('Turn off weather'),()=>{change(null);setResults([]);setOpen(false);})}
    </>}
  </View>;
}
