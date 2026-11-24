// SPDX-License-Identifier: AGPL-3.0-only
export type WeatherCity={label:string;latitude:number;longitude:number};
export type WeatherObservation={weatherCode:number;sunrise:number;sunset:number;sampledAt:number};
type Data=Record<string,unknown>;
const record=(value:unknown):Data=>value&&typeof value==='object'?value as Data:{};

export function weatherCity(value:unknown):WeatherCity|null {
  const {label,latitude,longitude}=record(value);
  if(typeof label!=='string'||!label.trim()||label.length>160||/[\p{Cc}\p{Cf}]/u.test(label)||
    typeof latitude!=='number'||!Number.isFinite(latitude)||Math.abs(latitude)>90||
    typeof longitude!=='number'||!Number.isFinite(longitude)||Math.abs(longitude)>180)return null;
  return {label:label.trim(),latitude:Math.round(latitude*100)/100,longitude:Math.round(longitude*100)/100};
}

export function searchResults(payload:unknown):WeatherCity[] {
  const {results}=record(payload);
  if(!Array.isArray(results))return [];
  return results.slice(0,6).flatMap(value=>{
    const candidate=record(value);
    const {name,admin1,country}=candidate;
    if(typeof name!=='string'||!name.trim())return [];
    const label=[...new Set([name,admin1,country].filter(value=>typeof value==='string'&&value.trim()))].join(', ');
    const result=weatherCity({...candidate,label});
    return result?[result]:[];
  });
}

export function weatherObservation(payload:unknown):WeatherObservation|null {
  const {current,daily}=record(payload);
  const {time,weather_code}=record(current);
  const {sunrise,sunset}=record(daily);
  const rise=Array.isArray(sunrise)?sunrise[0]:undefined;
  const set=Array.isArray(sunset)?sunset[0]:undefined;
  if(typeof time!=='number'||typeof weather_code!=='number'||!Number.isInteger(weather_code)||
    !Number.isFinite(time)||weather_code<0||weather_code>99||typeof rise!=='number'||
    !Number.isFinite(rise)||typeof set!=='number'||!Number.isFinite(set)||set<=rise||set-rise>86400)return null;
  return {weatherCode:weather_code,sunrise:rise,sunset:set,sampledAt:time};
}

export function weatherPhase(sample:WeatherObservation,now:number) {
  if(Math.abs(now-sample.sampledAt)>7200)return undefined;
  if(now<sample.sunrise-3600||now>=sample.sunset+3600)return 0;
  if(now<sample.sunrise+1800)return 6;
  if(now>=sample.sunset-1800)return 18;
  return 12;
}

export function weatherAccent(code:number):string|undefined {
  if(code>=95)return '#6c5597';
  if([71,73,75,77,85,86].includes(code))return '#a6c3da';
  if([45,48].includes(code))return '#929cb0';
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return '#5079a6';
  if(code===3)return '#788ca1';
}

async function readJson(url:string,signal:AbortSignal) {
  const result=await fetch(url,{signal,credentials:'omit'});
  if(!result.ok)throw new Error('weather_unavailable');
  return result.json();
}
export async function findWeatherCities(query:string,language:string,signal:AbortSignal) {
  const params=new URLSearchParams({name:query,count:'6',language:language==='it'?'it':'en'});
  return searchResults(await readJson('https://geocoding-api.open-meteo.com/v1/search?'+params,signal));
}

export async function fetchWeather(city:WeatherCity,signal:AbortSignal) {
  const params=new URLSearchParams({latitude:String(city.latitude),longitude:String(city.longitude),
    current:'weather_code',daily:'sunrise,sunset',timeformat:'unixtime',timezone:'auto',forecast_days:'1'});
  return weatherObservation(await readJson('https://api.open-meteo.com/v1/forecast?'+params,signal));
}
