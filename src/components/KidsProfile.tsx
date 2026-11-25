// SPDX-License-Identifier: AGPL-3.0-only
import React,{useEffect,useRef,useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {useTVScrollFocus} from '../hooks/useTVScrollFocus';
import {useKeyboard,focusId} from '../hooks/useKeyboard';
import {translator} from '../model/i18n';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';
import {Tile} from './Tile';
import {Wallpaper} from './Wallpaper';
import {TVTextInput} from './TVTextInput';

const pinPattern=/^\d{4,8}$/;
const pinStyle={minHeight:48,color:'#fff',fontSize:18,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:'#919bad'};
const noop=()=>{};

export function KidsHome({demo}:{demo:Launcher}) {
  const t=translator(demo.prefs.language);
  const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
  const onOffset=useTVScrollFocus(scroll,'page-0');
  const [unlock,setUnlock]=useState(false),[busy,setBusy]=useState(false);
  const [pin,setPin]=useState(''),[error,setError]=useState(false);
  const allowed=demo.catalog.filter(app=>app.kind==='app'&&demo.prefs.kidsApps?.includes(app.id));
  const open=()=>setUnlock(true);
  const close=()=>{setUnlock(false);setPin('');setError(false);};
  useKeyboard({panel:unlock?'kidsUnlock':null,page:0,changePage:noop,menu:noop,play:noop,control:open,close});
  useEffect(()=>{
    const timer=setTimeout(()=>focusId(unlock?'kids-pin-edit':allowed[0]?'kids:'+allowed[0].id:'kids-exit'),160);
    return()=>clearTimeout(timer);
  },[unlock,allowed[0]?.id]);
  async function leave(){
    if(busy||!pinPattern.test(pin))return;
    setBusy(true);setError(false);
    try{await demo.execute('kidsExit',{pin});demo.close();}
    catch{setPin('');setError(true);}
    finally{setBusy(false);}
  }
  const button=(id:string,label:string,press:()=>void,disabled=false)=><FocusButton id={id} group={unlock?'modal':'page-0'}
    label={t(label)} onPress={press} disabled={disabled} style={{minHeight:48,paddingHorizontal:12,alignSelf:'flex-start'}}>
    <Text style={{color:'#fff',fontSize:18}}>{t(label)}</Text>
  </FocusButton>;
  return <View style={{flex:1,paddingHorizontal:48,paddingTop:35,backgroundColor:'#091422'}}>
    <Wallpaper id={demo.prefs.wallpaper} motion={false}/>
    <Text accessibilityRole="header" style={{color:'#fff',fontSize:34,fontWeight:'600',marginBottom:16}}>{t('Kids')}</Text>
    {unlock?<View style={{width:'55%',maxWidth:500,gap:10}}>
      <TVTextInput id="kids-pin-edit" t={t} value={pin} onChangeText={setPin} maxLength={8} secureTextEntry keyboardType="number-pad"
        accessibilityLabel={t('Parent code')} placeholder={t('Parent code')} placeholderTextColor="#aeb9c9" style={pinStyle}/>
      {error&&<Text accessibilityLiveRegion="polite" style={{color:'#ffd0dc',fontSize:16}}>
        {t('Could not unlock. Check the code or wait 30 seconds.')}
      </Text>}
      {button('kids-unlock','Unlock Home',()=>void leave(),busy||!pinPattern.test(pin))}
      {button('kids-cancel','Cancel',close)}
    </View>:<>
      {button('kids-exit','Exit Kids',open)}
      <ScrollView ref={scroll} onScroll={event=>onOffset(event.nativeEvent.contentOffset.y)} scrollEventThrottle={48} style={{marginTop:20}} contentContainerStyle={{padding:8,paddingBottom:28}}>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:16}}>
          {allowed.map(app=><View key={app.id} style={{width:'22%',gap:6}}>
            <Tile native app={app} id={'kids:'+app.id} group="page-0"
              onPress={()=>void demo.execute('launch',{id:app.id}).catch(()=>{})} onSelect={noop} onMenu={noop}/>
            <Text style={{color:'#e6efff',textAlign:'center',fontSize:16}}>{app.name}</Text>
          </View>)}
          {!allowed.length&&<Text style={{color:'#e6efff',fontSize:18}}>{t('No approved apps are installed.')}</Text>}
        </View>
      </ScrollView>
    </>}
  </View>;
}

export function KidsProfileSettings({demo,t,viewers}:{demo:Launcher;t:(value:string)=>string;viewers:{id:string;label:string}[]}) {
  const [profile,setProfile]=useState('');
  const [apps,setApps]=useState<string[]>([]);
  const [pin,setPin]=useState(''),[oldPin,setOldPin]=useState('');
  const [configured,setConfigured]=useState(false),[loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  const [changes,setChanges]=useState(false),[confirm,setConfirm]=useState(false);
  const apply=(result:Record<string,unknown>)=>{
    setConfigured(typeof result.profile==='string');
    setProfile(typeof result.profile==='string'?result.profile:'');
    setApps(Array.isArray(result.apps)?result.apps.filter(id=>typeof id==='string'):[]);
  };
  useEffect(()=>{
    let live=true;
    void demo.execute('kidsStatus').then(value=>{if(live)apply(value);})
      .catch(()=>{if(live)setError(true);}).finally(()=>{if(live)setLoaded(true);});
    return()=>{live=false;};
  },[demo.execute]);
  async function change(disable=false){
    setBusy(true);setError(false);
    try{
      const result=await demo.execute(disable?'kidsDisable':'kidsConfigure',{profile,apps,oldPin,pin});
      apply(result);setChanges(false);setConfirm(false);setPin('');setOldPin('');
    }catch{setError(true);}finally{setBusy(false);}
  }
  const row=(id:string,label:string,onPress:()=>void,disabled=false)=><FocusButton key={id} id={'kids-settings-'+id}
    group="modal" label={label} onPress={onPress} disabled={busy||disabled}
    style={{minHeight:48,flexDirection:'row',gap:10,justifyContent:'flex-start',paddingHorizontal:10}}>
    <Icon name="check" size={18}/><Text style={{color:'#eef2ff',fontSize:17}}>{label}</Text>
  </FocusButton>;
  const field=(id:string,label:string,value:string,update:(pin:string)=>void)=><TVTextInput id={id} t={t}
    value={value} onChangeText={update} maxLength={8} secureTextEntry keyboardType="number-pad"
    accessibilityLabel={t(label)} placeholder={t(label)} placeholderTextColor="#aeb9c9" style={pinStyle}/>;
  return <View style={{gap:8}}>
    <Text style={{color:'#d6e3ff',fontSize:16}}>{t('Choose a profile and apps for Kids. The parent code only locks Aurea’s Kids screen.')}</Text>
    {error&&<Text accessibilityLiveRegion="polite" style={{color:'#f5d0dc'}}>
      {t('Could not change Kids settings. Check the parent code and try again.')}
    </Text>}
    {loaded&&viewers.map(viewer=>row(viewer.id,(viewer.id===profile?'✓ ':'')+viewer.label,()=>setProfile(viewer.id)))}
    {loaded&&!viewers.length&&<Text style={{color:'#d6e3ff'}}>{t('Create another household profile before setting up Kids.')}</Text>}
    {!!profile&&<>
      {row('show-apps',t('Choose approved apps')+' · '+apps.length,()=>setChanges(!changes))}
      {changes&&demo.catalog.filter(app=>app.kind==='app').map(app=>row(app.id,(apps.includes(app.id)?'✓ ':'')+app.name,
        ()=>setApps(values=>values.includes(app.id)?values.filter(id=>id!==app.id):[...values,app.id]),apps.length>=32&&!apps.includes(app.id)))}
      {configured&&field('existing-parent-pin','Current parent code',oldPin,setOldPin)}
      {field('new-parent-pin','New parent code (4–8 digits)',pin,setPin)}
      {row('save',t('Save Kids profile'),()=>void change(),!apps.length||!pinPattern.test(pin)||configured&&!pinPattern.test(oldPin))}
      {configured&&row('disable',t(confirm?'Confirm disable Kids':'Disable Kids'),()=>{
        if(confirm)void change(true);else setConfirm(true);
      },!pinPattern.test(oldPin))}
    </>}
  </View>;
}
