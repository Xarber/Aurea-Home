// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useRef,useState} from 'react';
import {Linking,Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {FocusButton} from './FocusButton';
import {TVTextInput} from './TVTextInput';
import {Icon} from './Icon';
import {discoveryHistory,exactDiscoveryTitle,rankRelatedTitles,type DiscoveryTitle as Title} from '../model/discovery-history';
import {tv} from '../platform/native/tv';

const categories={flatrate:'Subscription',free:'Free',ads:'With ads',rent:'Rent',buy:'Buy'} as const;
const style={color:'#fff',fontSize:17,minHeight:48,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:'#919bad'};

export function TitleDiscoverySettings({demo,t}:{demo:Launcher;t:(value:string)=>string}){
  const profile=demo.prefs.householdProfile??'home';
  const primary=profile==='home';
  const [ready,setReady]=useState<boolean>();
  const [token,setToken]=useState(''),[region,setRegion]=useState(demo.prefs.language==='it'?'IT':'US');
  const [query,setQuery]=useState(''),[titles,setTitles]=useState<Title[]>();
  const [related,setRelated]=useState<Title[]>();
  const [history,setHistory]=useState<string[]>();
  const [suggestions,setSuggestions]=useState(false);
  const live=useRef(true);
  const [selected,setSelected]=useState<Title>(),[availability,setAvailability]=useState<Record<string,unknown>>();
  const [pending,setPending]=useState(false),[error,setError]=useState(false),[setup,setSetup]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const settings=(result:Record<string,unknown>)=>{
    if(typeof result.configured==='boolean')setReady(result.configured);
    if(typeof result.region==='string'&&result.region)setRegion(result.region);
  };
  useEffect(()=>{
    live.current=true;
    void demo.execute('titleDiscoveryStatus').then(result=>{if(live.current)settings(result);}).catch(()=>{if(live.current)setError(true);});
    return()=>{live.current=false;};
  },[demo.execute]);
  async function run(operation:string,payload:Record<string,unknown>={}){
    setPending(true);setError(false);
    try {
      const result=await demo.execute(operation,payload);
      settings(result);
      if(operation==='titleDiscoverySearch'){setSuggestions(false);setTitles(Array.isArray(result.titles)?result.titles:[]);}
      if(operation==='titleDiscoveryProviders')setAvailability(result);
      if(operation==='titleDiscoveryRelated')setRelated(Array.isArray(result.titles)?result.titles:[]);
      if(operation==='titleDiscoveryStremio')demo.close();
      if(operation==='titleDiscoveryConfigure'){setSetup(false);setToken('');setConfirm(false);}
      if(operation==='titleDiscoveryDisconnect'){setTitles(undefined);setConfirm(false);}
    }catch{setError(true);}finally{setPending(false);}
  }
  async function openHistory(){
    setPending(true);setError(false);
    try {
      const [local,imported]=await Promise.all([
        demo.execute('localWatchHistory'),demo.execute('viewingExports',{profile}),
      ]);
      setHistory(discoveryHistory(local.records,imported.entries));
    }catch{setError(true);}finally{setPending(false);}
  }
  async function recommend(){
    if(!history?.length)return;
    setPending(true);setError(false);
    try{
      const seeds:Title[]=[];
      for(const query of history.slice(0,3)){
        if(!live.current)return;
        const result=await tv.execute('titleDiscoverySearch',{query});
        const match=exactDiscoveryTitle(Array.isArray(result.titles)?result.titles:[],query);
        if(match&&!seeds.some(item=>item.id===match.id&&item.kind===match.kind))seeds.push(match);
      }
      const related:Title[][]=[];
      for(const seed of seeds){
        if(!live.current)return;
        const result=await tv.execute('titleDiscoveryRelated',{id:seed.id,kind:seed.kind});
        if(Array.isArray(result.titles))related.push(result.titles);
      }
      if(!live.current)return;
      setSuggestions(true);setTitles(rankRelatedTitles(seeds,related));setHistory(undefined);
    }catch{if(live.current)setError(true);}finally{if(live.current)setPending(false);}
  }
  const field=(id:string,label:string,value:string,update:(value:string)=>void,limit:number,secret=false)=><TVTextInput
    id={id} t={t} value={value} onChangeText={update} maxLength={limit} secureTextEntry={secret} autoCorrect={false}
    accessibilityLabel={t(label)} placeholder={t(label)} placeholderTextColor="#aeb9c9" style={style}/>;
  const row=(id:string,label:string,click:()=>void,detail?:string,disabled=false)=><FocusButton key={id} id={'discovery-'+id}
    group="modal" label={label} onPress={click} disabled={disabled||pending}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:8}}>
    <Icon name="film" size={21}/><View style={{flex:1,gap:4}}><Text style={{color:'#eef2ff',fontSize:17}}>{label}</Text>
    {!!detail&&<Text style={{color:'#c4d1e8',fontSize:15}}>{detail}</Text>}</View>
  </FocusButton>;
  function choose(item:Title) {
    setSelected(item);setAvailability(undefined);setRelated(undefined);
    void run('titleDiscoveryProviders',{kind:item.kind,id:item.id});
  }
  const text=(value:string)=><Text style={{fontSize:16,color:'#d6e3ff'}}>{t(value)}</Text>;
  const providers=availability?.providers as Record<string,string[]>|undefined;
  return <View style={{gap:8,paddingVertical:8}}>
    {pending&&<Text accessibilityLiveRegion="polite" style={{color:'#d6e3ff'}}>{t('Checking title information…')}</Text>}
    {error&&<Text accessibilityLiveRegion="polite" style={{color:'#fad2e3'}}>{t('Title information is unavailable. Check the connection or token.')}</Text>}
    {!ready||setup?<>
      {primary?<>
        {text('Enter your TMDB API read access token and a two-letter availability country code.')}
        {field('discovery-region','Country code',region,region=>setRegion(region.toUpperCase()),2)}
        {field('discovery-token','TMDB API read access token',token,setToken,4096,true)}
        {row('save',t('Connect TMDB'),()=>void run('titleDiscoveryConfigure',{region,token:token.trim()}),
          undefined,!/^[A-Z]{2}$/.test(region)||!token.trim())}
        {ready&&row('cancel',t('Cancel'),()=>setSetup(false))}
        {ready&&row('disconnect',t(confirm?'Confirm disconnect':'Disconnect TMDB'),()=>{
          if(confirm)void run('titleDiscoveryDisconnect');else setConfirm(true);
        })}
      </>:text('Set up title search from the Home profile.')}
    </>:selected?<>
      {text(selected.title)}
      {providers&&Object.entries(categories).map(([id,label])=>providers[id]?.length?
        <View key={id} style={{gap:3,paddingHorizontal:7}}>{text(label)}{text(providers[id].join(' · '))}</View>:null)}
      {providers&&!Object.keys(providers).length&&text('No provider listings for this title in the selected country.')}
      {!!availability&&row('availability',t('Open availability page'),()=>{
        void Linking.openURL('https://www.themoviedb.org/'+selected.kind+'/'+selected.id+'/watch').catch(()=>setError(true));
      },region)}
      {demo.catalog.some(app=>app.id==='com.stremio.one')&&row('stremio',t('Open in Stremio'),
        ()=>void run('titleDiscoveryStremio',{kind:selected.kind,id:selected.id}))}
      {row('related',t('Related titles'),()=>void run('titleDiscoveryRelated',{kind:selected.kind,id:selected.id}))}
      {related?.length===0&&text('No related titles were returned.')}
      {related?.map(item=>row('related-'+item.kind+'-'+item.id,item.title,()=>choose(item),item.year))}
      {row('back',t('Back to search'),()=>{setSelected(undefined);setAvailability(undefined);})}
    </>:<>
      {history===undefined&&row('history',t('Start from viewing history'),()=>void openHistory())}
      {history!==undefined&&<>
        {text('Choose a title to search, or send the listed recent titles to TMDB for suggestions.')}
        {history.length===0&&text('No movie or series titles found in this profile’s history.')}
        {history.length>0&&row('recommend',t('Suggest titles from the latest three'),()=>void recommend(),
          history.slice(0,3).join(' · '))}
        {history.map((title,index)=>row('history-'+index,title,()=>{
          setQuery(title);setSuggestions(false);setTitles(undefined);setHistory(undefined);
        }))}
        {row('close-history',t('Back to search'),()=>setHistory(undefined))}
      </>}
      {history===undefined&&field('discovery-query','Movie or series',query,setQuery,120)}
      {history===undefined&&row('search',t('Search'),()=>void run('titleDiscoverySearch',{query:query.trim()}),undefined,query.trim().length<2)}
      {history===undefined&&suggestions&&text('Suggested for this profile')}
      {history===undefined&&titles?.length===0&&text(suggestions?'No suggestions for these titles.':'No matching titles.')}
      {history===undefined&&titles?.map(item=>row(item.kind+'-'+item.id,item.title,()=>choose(item),
        [t(item.kind==='movie'?'Movie':'Series'),item.year].filter(Boolean).join(' · ')))}
      {primary&&row('settings',t('Title search settings'),()=>setSetup(true),region)}
    </>}
    <Text style={{fontSize:13,color:'#d6e3ff'}}>{t('This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability provided by JustWatch.')}</Text>
  </View>;
}
