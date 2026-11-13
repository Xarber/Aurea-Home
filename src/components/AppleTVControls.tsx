// SPDX-License-Identifier: AGPL-3.0-only
import {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';
import type {IconName} from '../model/catalog';

type Operation = 'apps' | 'launch_app' | 'navigation';
type App = {id: string; name: string};
const controls: {key: string; label: string; icon?: IconName; symbol?: string}[] = [
  {key:'up',label:'Up',symbol:'↑'}, {key:'left',label:'Left',symbol:'←'},
  {key:'select',label:'Select',symbol:'OK'}, {key:'right',label:'Right',symbol:'→'},
  {key:'down',label:'Down',symbol:'↓'}, {key:'back',label:'Back',icon:'back'},
  {key:'home',label:'Apple TV Home',icon:'home'}, {key:'playpause',label:'Play / Pause',icon:'playpause'},
  {key:'volumedown',label:'Volume down',symbol:'−'}, {key:'volumeup',label:'Volume up',symbol:'+'},
];

export function AppleTVControls({request, group, appsPaired, connected=true, t=(label)=>label}:{
  request:(operation:Operation,payload:Record<string,unknown>)=>Promise<Record<string,unknown>>;
  group:string; appsPaired:boolean; connected?:boolean; t?:(label:string)=>string;
}){
  const [apps,setApps]=useState<App[]>([]);
  const [status,setStatus]=useState('');
  const [loading,setLoading]=useState(false);

  async function run(operation:Operation,payload:Record<string,unknown>={}){
    setStatus('');
    if(operation==='apps')setLoading(true);
    try{
      const response=await request(operation,payload);
      if(response.error)throw new Error(String(response.error));
      if(operation==='apps'){
        const list=Array.isArray(response.apps)?response.apps.filter((app):app is App=>
          typeof app?.id==='string'&&/^[A-Za-z0-9._-]{1,200}$/.test(app.id)&&
          typeof app.name==='string'&&app.name.length<=200).slice(0,250):[];
        setApps(list);
        if(!list.length)setStatus(t('No launchable Apple TV apps found.'));
      }
    }catch{
      setStatus(t('Apple TV could not complete this action. Try again.'));
    }finally{
      if(operation==='apps')setLoading(false);
    }
  }

  useEffect(()=>{
    if(connected&&appsPaired)void run('apps');
    else setApps([]);
  },[connected,appsPaired]);

  const music=apps.find(app=>app.id==='com.apple.TVMusic');
  return <View style={styles.body}>
    {!connected&&<Text style={styles.secondary}>{t('Waiting for the paired Apple TV…')}</Text>}
    <View style={styles.keys}>
      {controls.map(({key,label,icon,symbol})=>
        <FocusButton key={key} id={'apple-key-'+key} label={t(label)} group={group} disabled={!connected}
          onPress={()=>void run('navigation',{key})} style={key==='home'?styles.row:styles.key}>
          {icon?<Icon name={icon} size={22}/>:<Text style={styles.label}>{symbol}</Text>}
          {key==='home'&&<Text style={styles.label}>{t(label)}</Text>}
        </FocusButton>)}
    </View>
    {appsPaired?<View style={styles.body}>
      {music&&<FocusButton id="apple-open-music" label={t('Open Music')} group={group} style={styles.row} disabled={!connected}
        onPress={()=>void run('launch_app',{id:music.id})}><Icon name="music" size={20}/><Text style={styles.label}>{t('Open Music')}</Text></FocusButton>}
      <FocusButton id="apple-refresh-apps" label={t('Refresh Apple TV apps')} group={group} style={styles.row}
        disabled={!connected||loading} onPress={()=>void run('apps')}>
        <Icon name="apps" size={20}/><Text style={styles.label}>{t(loading?'Loading apps…':'Refresh Apple TV apps')}</Text>
      </FocusButton>
      {apps.filter(app=>app!==music).map(app=><FocusButton key={app.id} id={'apple-app-'+app.id}
        label={app.name} group={group} style={styles.row} disabled={!connected} onPress={()=>void run('launch_app',{id:app.id})}>
        <Icon name="apps" size={20}/><Text style={styles.label}>{app.name}</Text>
      </FocusButton>)}
    </View>:<Text style={styles.secondary}>{t('To list and open apps, choose Enable Apple TV apps in Aurea Home’s paired-device settings.')}</Text>}
    {!!status&&<Text accessibilityLiveRegion="polite" style={styles.secondary}>{status}</Text>}
  </View>;
}
const styles=StyleSheet.create({
  body:{gap:10}, keys:{flexDirection:'row',flexWrap:'wrap',gap:8},
  key:{minWidth:52,minHeight:50,borderRadius:14,backgroundColor:'#ffffff13'},
  row:{minHeight:48,padding:12,borderRadius:14,backgroundColor:'#ffffff13',flexDirection:'row',gap:12,justifyContent:'flex-start'},
  label:{color:'#fff',fontSize:16,flexShrink:1},
  secondary:{color:'#c2cad7',lineHeight:21},
});
