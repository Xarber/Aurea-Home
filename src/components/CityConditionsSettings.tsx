// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {cityConditions,type CityConditions} from '../model/weather';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';
import {WallpaperWeatherSettings} from './WallpaperWeatherSettings';

export function CityConditionsSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}){
  const city=demo.prefs.weatherCity;
  const [data,setData]=useState<CityConditions>();
  const [busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
  const request=useRef<AbortController>(null);
  const query=city?city.latitude+','+city.longitude:'';
  useEffect(()=>{
    setData(undefined);setBusy(false);setFailed(false);
    return()=>{request.current?.abort();request.current=null;};
  },[query]);
  async function refresh(){
    if(!city||busy)return;
    const current=new AbortController();
    request.current=current;setBusy(true);setFailed(false);
    const deadline=setTimeout(()=>current.abort(),8000);
    try{
      const next=await cityConditions(city,current.signal);
      if(request.current===current)setData(next);
    }catch{if(request.current===current){setData(undefined);setFailed(true);}}
    finally{clearTimeout(deadline);if(request.current===current)setBusy(false);}
  }
  const label=(name:string,value:number|undefined,unit:string,digits=0)=><View key={name}
    style={{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:8,paddingVertical:8}}>
    <Text style={{color:'#d6e3ff',fontSize:16}}>{t(name)}</Text>
    <Text style={{color:'#fff',fontSize:17,fontVariant:['tabular-nums']}}>{value===undefined?'—':
      new Intl.NumberFormat(demo.prefs.language,{maximumFractionDigits:digits}).format(value)+unit}</Text>
  </View>;
  return <View style={{gap:8}}>
    <Text style={{color:'#d6e3ff',fontSize:16}}>{city?.label??t('Choose a city to check local conditions.')}</Text>
    {!!city&&<FocusButton id="city-conditions-refresh" group="modal" label={t('Refresh conditions')} disabled={busy}
      onPress={()=>void refresh()} style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:9,gap:10}}>
      <Icon name="sun" size={21}/><Text style={{color:'#eef2ff',fontSize:17}}>{t('Refresh conditions')}</Text>
    </FocusButton>}
    {(failed||busy)&&<Text accessibilityLiveRegion="polite" style={{color:'#d6e3ff',fontSize:16}}>
      {t(busy?'Loading local conditions…':'Local conditions are unavailable.')}
    </Text>}
    {data&&<>
      {label('Temperature',data.temp,' °C',1)}
      {label('Humidity',data.humidity,'%')}
      {label('Today’s maximum UV index',data.uvMax,'',1)}
      {label('European air quality index',data.aqi,'')}
      {data.weatherAt!==undefined&&<Text style={{color:'#d6e3ff',fontSize:13}}>
        {t('Weather model time')+' · '+new Date(data.weatherAt*1000).toLocaleString(demo.prefs.language)}
      </Text>}
      {data.airAt!==undefined&&<Text style={{color:'#d6e3ff',fontSize:13}}>
        {t('Air quality model time')+' · '+new Date(data.airAt*1000).toLocaleString(demo.prefs.language)}
      </Text>}
      <Text style={{color:'#d6e3ff',fontSize:13}}>{t('Model estimates from Open-Meteo and CAMS.')}</Text>
    </>}
    <WallpaperWeatherSettings city={city} language={demo.prefs.language} t={t} change={weatherCity=>demo.change({weatherCity})}/>
  </View>;
}
