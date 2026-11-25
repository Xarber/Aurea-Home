// SPDX-License-Identifier: AGPL-3.0-only
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Image,Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {tv} from '../platform/native/tv';
import {adjustedTemperature,isHomeEntity} from '../model/home-assistant';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';
import {TVTextInput} from './TVTextInput';

const fieldStyle={color:'#fff',fontSize:17,minHeight:48,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:'#919bad'};
const empty:Record<string,unknown>={};

export function HomeAssistantSettings({demo,t}:{demo:Launcher;t:(value:string)=>string}) {
  const [connected,setConnected]=useState<boolean>();
  const [server,setServer]=useState(''),[token,setToken]=useState(''),[entity,setEntity]=useState('');
  const [entities,setEntities]=useState<string[]>([]);
  const [states,setStates]=useState<Record<string,Record<string,unknown>>>({});
  const [busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
  const cameraGeneration=useRef(0);
  useEffect(()=>{
    const session=AppState.addEventListener('change',value=>{
      if(value!=='active'){cameraGeneration.current++;setCamera(undefined);}
    });
    return()=>{cameraGeneration.current++;session.remove();};
  },[]);
  const [camera,setCamera]=useState<{uri:string;received:number}>();
  const [selected,setSelected]=useState<string>(),[confirm,setConfirm]=useState<string>();
  const apply=useCallback((result:Record<string,unknown>)=>{
    if(typeof result.connected==='boolean')setConnected(result.connected);
    if(Array.isArray(result.entities))setEntities(result.entities.filter((id):id is string=>typeof id==='string'&&isHomeEntity(id)));
  },[]);
  useEffect(()=>{
    let live=true;
    void demo.execute('haStatus').then(result=>{if(live)apply(result);}).catch(()=>{if(live)setFailed(true);});
    return()=>{live=false;};
  },[demo.execute,apply]);
  useEffect(()=>{
    if(!connected||!entities.length)return;
    let live=true;
    void (async()=>{
      for(const id of entities){
        if(!live)break;
        const result=await tv.execute('haState',{id}).catch(()=>({state:'unavailable'}));
        if(live)setStates(previous=>({...previous,[id]:result}));
      }
    })();
    return()=>{live=false;};
  },[connected,entities,demo.execute]);
  async function run(operation:string,payload:Record<string,unknown>={}) {
    if(busy)return;
    const generation=cameraGeneration.current;
    setBusy(true);setFailed(false);
    try{
      const result=await demo.execute(operation,payload);
      if(operation==='haCamera'){
        if(generation!==cameraGeneration.current)return;
        if(typeof result.image!=='string'||!result.image.startsWith('data:image/jpeg;base64,')||
          typeof result.receivedAt!=='number')throw new Error('invalid_camera_image');
        setCamera({uri:result.image,received:result.receivedAt});
      }else if(typeof payload.id==='string'&&typeof result.state==='string'){
        const id=payload.id;
        setStates(previous=>({...previous,[id]:result}));
      }else apply(result);
      if(operation==='haConnect'){setServer('');setToken('');}
      if(operation==='haEntity'){setEntity('');if(payload.add!==true){setSelected(undefined);setCamera(undefined);}}
      setConfirm(undefined);
    }catch{setFailed(true);}finally{setBusy(false);}
  }
  const row=(id:string,label:string,action:()=>void,detail?:string,disabled=false)=><FocusButton
    key={id} id={'ha-'+id} group="modal" label={[label,detail].filter(Boolean).join(' · ')} onPress={action} disabled={busy||disabled}
    style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',gap:10,paddingHorizontal:10}}>
    <Icon name="home" size={21}/><Text style={{color:'#eef2ff',fontSize:17,flex:1}}>{label}</Text>
    {!!detail&&<Text style={{color:'#cddaf1',fontSize:15}}>{detail}</Text>}
  </FocusButton>;
  const text=(value:string)=><Text style={{color:'#d6e3ff',fontSize:15,paddingHorizontal:8}}>{t(value)}</Text>;
  const state=selected?states[selected]??empty:empty;
  const detail=(rowState:Record<string,unknown>)=>typeof rowState.state==='string'?
    rowState.state+(typeof rowState.unit==='string'&&rowState.unit?' '+rowState.unit:''):undefined;
  const name=(id:string,r:Record<string,unknown>)=>typeof r.name==='string'?r.name:id;
  return <View style={{gap:7,paddingVertical:7}}>
    {failed&&<Text accessibilityLiveRegion="polite" style={{color:'#f5d0dc',fontSize:16}}>
      {t('Home Assistant could not complete the request. Check the server and permissions.')}
    </Text>}
    {connected===undefined&&text('Checking Home Assistant…')}
    {connected===false&&<>
      {text('Connect a Home Assistant server you trust. Use its HTTPS address and an access token from a non-admin account.')}
      <TVTextInput id="ha-address" t={t} value={server} onChangeText={setServer} maxLength={512}
        autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('Server HTTPS URL')} placeholder={t('Server HTTPS URL')}
        placeholderTextColor="#aeb9c9" style={fieldStyle}/>
      <TVTextInput id="ha-token" t={t} value={token} onChangeText={setToken} maxLength={4096} secureTextEntry
        autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('Access token')} placeholder={t('Access token')}
        placeholderTextColor="#aeb9c9" style={fieldStyle}/>
      {row('connect',t('Connect Home Assistant'),()=>void run('haConnect',{server:server.trim(),token:token.trim()}),
        undefined,!server.trim()||!token.trim())}
    </>}
    {connected===true&&!selected&&<>
      {entities.map(id=>row(id,name(id,states[id]??empty),()=>setSelected(id),detail(states[id]??empty)))}
      {entities.length<8&&<>
        {text('Add a light, switch, scene, thermostat, sensor, or camera by its entity ID.')}
        <TVTextInput id="ha-entity-edit" t={t} value={entity} onChangeText={setEntity} maxLength={135}
          autoCapitalize="none" autoCorrect={false} accessibilityLabel={t('Entity ID')} placeholder="light.living_room"
          placeholderTextColor="#aeb9c9" style={fieldStyle}/>
        {row('add',t('Add device'),()=>void run('haEntity',{id:entity.trim(),add:true}),undefined,!isHomeEntity(entity.trim()))}
      </>}
      {row('disconnect',t(confirm==='disconnect'?'Confirm disconnect':'Disconnect Home Assistant'),()=>{
        if(confirm==='disconnect')void run('haDisconnect');else setConfirm('disconnect');
      })}
    </>}
    {connected===true&&selected&&<>
      {text(name(selected,state))}
      {!!detail(state)&&text(detail(state)!)}
      {selected.startsWith('camera.')&&<>
        {camera&&<>
          <Image source={{uri:camera.uri}} accessibilityLabel={t('Camera snapshot')}
            style={{width:'100%',aspectRatio:16/9,borderRadius:12}} resizeMode="contain"/>
          {text(t('Snapshot received')+' · '+new Date(camera.received).toLocaleTimeString(demo.prefs.language))}
        </>}
        {row('camera',t(camera?'Refresh camera snapshot':'View camera snapshot'),()=>{
          setCamera(undefined);
          void run('haCamera',{id:selected});
        })}
        {camera&&row('hide-image',t('Hide snapshot'),()=>setCamera(undefined))}
      </>}
      {selected.startsWith('scene.')&&row('activate',t('Activate scene'),()=>void run('haCommand',{id:selected,action:'turn_on'}))}
      {/^(light|switch)\./.test(selected)&&state.state!=='unavailable'&&
        row('toggle',t(state.state==='on'?'Turn off':'Turn on'),()=>void run('haCommand',{id:selected,action:state.state==='on'?'turn_off':'turn_on'}))}
      {selected.startsWith('climate.')&&typeof state.target==='number'&&<>
        {text(t('Target temperature')+' · '+state.target)}
        {([-1,1] as const).map(direction=>{
          const value=adjustedTemperature(state,direction);
          return row('temperature-'+direction,t(direction===-1?'Lower temperature':'Raise temperature'),
            ()=>void run('haCommand',{id:selected,action:'set_temperature',value}),value?.toString(),value===undefined);
        })}
      </>}
      {row('refresh',t('Refresh state'),()=>void run('haState',{id:selected}))}
      {row('remove',t(confirm===selected?'Confirm remove device':'Remove device'),()=>{
        if(confirm===selected)void run('haEntity',{id:selected,add:false});else setConfirm(selected);
      })}
      {row('back',t('Back to devices'),()=>{setSelected(undefined);setConfirm(undefined);setCamera(undefined);})}
    </>}
  </View>;
}
