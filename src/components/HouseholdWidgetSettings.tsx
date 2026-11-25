// SPDX-License-Identifier: AGPL-3.0-only
import {TVTextInput} from './TVTextInput';
import React,{useEffect,useState} from 'react';
import {AppState,Text,View} from 'react-native';
import type {Launcher} from '../launcher/types';
import {countdownDate,daysUntil,displayCard,estimatedMoonPhase,listRows,nextCollectionDate,parseWidgets,remainingTime,timerMinutes,type Widget} from '../model/widgets';
import {FocusButton} from './FocusButton';
import {Icon} from './Icon';

const locations=[['Local UTC','UTC'],['Rome','Europe/Rome'],['London','Europe/London'],
 ['New York','America/New_York'],['Los Angeles','America/Los_Angeles'],['Dubai','Asia/Dubai'],
 ['Tokyo','Asia/Tokyo'],['Sydney','Australia/Sydney']] as const;

function clock(now:number,zone:string,language:string) {
 try{return new Intl.DateTimeFormat(language,{timeZone:zone,hour:'2-digit',minute:'2-digit'}).format(now);}
 catch{return '—';}
}

export function HouseholdWidgetSettings({demo,t}:{demo:Launcher;t:(text:string)=>string}) {
 const profile=demo.prefs.householdProfile??'home';
 const [widgets,setWidgets]=useState<Widget[]>([]);
 const [form,setForm]=useState<'timer'|'clock'|'countdown'|'note'|'list'|'card'|'agenda'|'collection'>();
 const [repeat,setRepeat]=useState<7|14>(7);
 const [name,setName]=useState(''),[value,setValue]=useState('');
 const [loading,setLoading]=useState(true),[error,setError]=useState(false);
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{
  let live=true;
  void demo.execute('widgetList',{profile}).then(result=>{
   if(live)setWidgets(parseWidgets(result.widgets));
  }).catch(()=>{if(live)setError(true);}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[demo.execute,profile]);
 useEffect(()=>{
  const tick=()=>{if(!['background','inactive'].includes(AppState.currentState??''))setNow(Date.now());};
  const timer=setInterval(tick,widgets.some(widget=>widget.type==='timer')?1000:30000);
  const state=AppState.addEventListener('change',tick);
  return()=>{clearInterval(timer);state.remove();};
 },[widgets]);
 async function change(payload:Record<string,unknown>){
  if(loading)return;
  setLoading(true);setError(false);
  try{
   const result=await demo.execute('widgetChange',{profile,...payload});
   setWidgets(parseWidgets(result.widgets));setForm(undefined);setName('');setValue('');
  }catch{setError(true);}finally{setLoading(false);}
 }
 const row=(id:string,label:string,press:()=>void,detail?:string,disabled=false)=><FocusButton
  key={id} id={'household-widget-'+id} group="modal" label={[label,detail].filter(Boolean).join(' · ')}
  onPress={press} disabled={disabled||loading} style={{minHeight:48,flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:10,gap:8}}>
  <Icon name="sun" size={18}/><Text style={{color:'#f4f6ff',fontSize:17,flex:1}}>{label}</Text>
  {detail&&<Text style={{color:'#dee8fc',fontVariant:['tabular-nums'],fontSize:17}}>{detail}</Text>}
 </FocusButton>;
 const [remove,setRemove]=useState<string>();
 const phase=estimatedMoonPhase(now);
 const minutes=timerMinutes(value);
 const date=countdownDate(value,now);
 const rows=listRows(value),card=displayCard(value);
 const inputStyle={minHeight:48,borderColor:'#8e99ab',borderWidth:1,borderRadius:12,paddingHorizontal:12,color:'#fff',fontSize:16};
 return <View style={{gap:7,paddingVertical:8}}>
  {error&&<Text accessibilityLiveRegion="polite" style={{color:'#ffd4e0'}}>{t('Could not update household widgets.')}</Text>}
  {!form&&<>
   {phase&&<Text accessibilityRole="text" style={{color:'#dee8fc',paddingHorizontal:12,paddingVertical:6,fontSize:16}}>
    {t('Estimated moon phase')+' · '+t(phase)}
   </Text>}
   {[...widgets.filter(widget=>widget.type!=='agenda'),
      ...widgets.filter(widget=>widget.type==='agenda').sort((first,second)=>first.date.localeCompare(second.date))].map(widget=><View key={widget.id}>
    {row(widget.id,remove===widget.id?t('Remove')+' · '+widget.label:widget.label,()=>{
    if(remove!==widget.id){setRemove(widget.id);return;}
    setRemove(undefined);
    void change({action:'remove',id:widget.id});
   },widget.type==='clock'?clock(now,widget.zone,demo.prefs.language):
      widget.type==='note'||widget.type==='card'||widget.type==='list'?undefined:
      widget.type==='collection'?new Date((nextCollectionDate(widget.date,widget.interval,now)??widget.date)+'T12:00:00')
        .toLocaleDateString(demo.prefs.language):widget.type==='agenda'?new Date(widget.date+'T12:00:00').toLocaleDateString(demo.prefs.language):widget.type==='countdown'?(now>=widget.until?t('Reached date'):new Intl.NumberFormat(demo.prefs.language,
        {style:'unit',unit:'day',unitDisplay:'long'}).format(daysUntil(widget.until,now))):
      widget.type==='timer'?(now>=widget.until?t('Finished'):remainingTime(widget.until,now)):undefined)}
    {(widget.type==='list'||widget.type==='card')&&widget.rows.map((item,index)=>widget.type==='list'?
      row(widget.id+'-item-'+index,(item.done?'✓ ':'')+item.text,()=>void change({action:'toggle-item',id:widget.id,index})):
      <Text key={index} style={{color:'#dee8fc',paddingHorizontal:14,paddingBottom:5,fontSize:16}}>{item.text}</Text>)}
    {widget.type==='note'&&<Text style={{color:'#dee8fc',lineHeight:23,paddingHorizontal:12,paddingBottom:8}}>{widget.body}</Text>}
   </View>)}
   {widgets.length<12&&<>
    {row('timer',t('Add timer'),()=>setForm('timer'))}
    {row('clock',t('Add world clock'),()=>setForm('clock'))}
    {row('countdown',t('Add date countdown'),()=>setForm('countdown'))}
    {row('note',t('Add note'),()=>setForm('note'))}
    {row('list',t('Add household list'),()=>setForm('list'))}
    {row('agenda',t('Add calendar entry'),()=>setForm('agenda'))}
    {row('collection',t('Add bin collection reminder'),()=>{setRepeat(7);setForm('collection');})}
    {row('card',t('Add a JSON display card'),()=>setForm('card'))}
   </>}
  </>}
  {form==='timer'&&<>
   <TVTextInput id="timer-label" t={t} value={name} onChangeText={setName} maxLength={48} placeholder={t('Timer name')}
    accessibilityLabel={t('Timer name')} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   <TVTextInput id="timer-minutes" t={t} value={value} onChangeText={setValue} maxLength={4} keyboardType="numeric" placeholder={t('Minutes')}
    accessibilityLabel={t('Minutes')} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   {row('start',t('Start timer'),()=>void change({action:'timer',label:name.trim()||t('Timer'),minutes}),undefined,!minutes)}
  </>}
  {form==='clock'&&<>
   {locations.map(([name,zone])=>row(zone,t(name),()=>void change({action:'clock',label:t(name),zone}),
     clock(now,zone,demo.prefs.language)))}
   <TVTextInput id="clock-zone" t={t} value={value} onChangeText={setValue} maxLength={80} autoCapitalize="none" autoCorrect={false}
    placeholder={t('Time zone (e.g. Europe/Paris)')} accessibilityLabel={t('Time zone')}
    placeholderTextColor="#aeb9c9" style={inputStyle}/>
   {row('custom',t('Add time zone'),()=>void change({action:'clock',label:value.trim().replaceAll('_',' '),zone:value.trim()}),
     undefined,clock(now,value.trim(),demo.prefs.language)==='—')}
  </>}
  {form==='countdown'&&<>
   <TVTextInput id="countdown-label" t={t} value={name} onChangeText={setName} maxLength={48} placeholder={t('Countdown name')}
    accessibilityLabel={t('Countdown name')} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   <TVTextInput id="countdown-date" t={t} value={value} onChangeText={setValue} maxLength={10} placeholder="YYYY-MM-DD"
    accessibilityLabel={t('Countdown date (year-month-day)')} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   {row('start-date',t('Start countdown'),()=>void change({action:'countdown',label:name.trim()||t('Countdown'),date}),undefined,!date)}
  </>}
  {form==='note'&&<>
   <TVTextInput id="note-title" t={t} value={name} onChangeText={setName} maxLength={48} placeholder={t('Note title')}
    accessibilityLabel={t('Note title')} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   <TVTextInput id="note-body" t={t} value={value} onChangeText={setValue} maxLength={600} multiline
    placeholder={t('Note')} accessibilityLabel={t('Note')} placeholderTextColor="#aeb9c9" style={[inputStyle,{minHeight:80}]}/>
   {row('save-note',t('Save note'),()=>void change({action:'note',label:name.trim()||t('Note'),body:value.trim()}),undefined,!value.trim())}
  </>}
  {form==='list'&&<>
   <TVTextInput id="widget-list-title" t={t} value={name} onChangeText={setName} maxLength={48}
    placeholder={t('List title')} accessibilityLabel={t('List title')} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   <TVTextInput id="widget-list-rows" t={t} value={value} onChangeText={setValue} maxLength={1600} multiline
    placeholder={t('One item per line')} accessibilityLabel={t('One item per line')} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   {row('save-list',t('Save list'),()=>void change({action:'list',label:name.trim()||t('Household list'),rows}),undefined,!rows)}
  </>}
  {form==='agenda'&&<>
   <TVTextInput id="agenda-title" t={t} value={name} onChangeText={setName} maxLength={48}
    placeholder={t('Event title')} accessibilityLabel={t('Event title')} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   <TVTextInput id="agenda-date" t={t} value={value} onChangeText={setValue} maxLength={10}
    placeholder="YYYY-MM-DD" accessibilityLabel={t('Event date')} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   {row('save-agenda',t('Save event'),()=>void change({action:'agenda',label:name.trim(),date}),undefined,!date||!name.trim())}
  </>}
  {form==='collection'&&<>
   <TVTextInput id="collection-name" t={t} value={name} onChangeText={setName} maxLength={48}
    placeholder={t('Bin name')} accessibilityLabel={t('Bin name')} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   <TVTextInput id="collection-date" t={t} value={value} onChangeText={setValue} maxLength={10}
    placeholder="YYYY-MM-DD" accessibilityLabel={t('First collection date')} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   {row('repeat',t('Repeat'),()=>setRepeat(current=>current===7?14:7),t(repeat===7?'Weekly':'Every two weeks'))}
   {row('save-collection',t('Save reminder'),()=>void change({action:'collection',label:name.trim(),date,interval:repeat}),
    undefined,!date||!name.trim())}
  </>}
  {form==='card'&&<>
   <Text style={{color:'#d6e3ff',fontSize:15}}>{t('Use a title and up to 16 plain text rows.')}</Text>
   <TVTextInput id="widget-card-json" t={t} value={value} onChangeText={setValue} maxLength={4096} multiline
    autoCorrect={false} autoCapitalize="none" accessibilityLabel={t('Display card JSON')}
    placeholder={'{"schema":1,"label":"Weekend","rows":["Groceries at 10"]}'} placeholderTextColor="#aeb9c9" style={inputStyle}/>
   {row('save-card',t('Save display card'),()=>void change({action:'card',...card}),undefined,!card)}
  </>}
  {!!form&&row('cancel',t('Cancel'),()=>{setForm(undefined);setName('');setValue('');})}
 </View>;
}
