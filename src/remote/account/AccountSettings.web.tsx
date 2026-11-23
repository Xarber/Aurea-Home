// SPDX-License-Identifier: AGPL-3.0-only
import React, {useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import {FocusButton} from '../../components/FocusButton';
import {Icon} from '../../components/Icon';
import type {Layout} from './AccountSettings';

type Session = {available:true; signedIn:boolean; name?:string};
type Snapshot = {revision:string; preferences:(Layout & {schema:1}) | null};

async function request(path:string, init?:RequestInit) {
  const response = await fetch('/account/' + path, {
    ...init, cache:'no-store', credentials:'same-origin', redirect:'error',
    headers:{Accept:'application/json', ...init?.headers},
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(String(response.status));
  }
  return response.json();
}

export function AccountSettings({layout, restore}:{layout:Layout; restore:(layout:Layout)=>void}) {
  const [session, setSession] = useState<Session>();
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(false);
  useEffect(() => {
    if (location.origin !== 'https://aurea.xcenter.it') return;
    const controller = new AbortController();
    void request('session', {signal:controller.signal}).then(data => {
      if (data.available === true && typeof data.signedIn === 'boolean') setSession(data);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  if (!session) return null;

  async function run(action:()=>Promise<void>) {
    setBusy(true);
    setStatus('');
    try {await action();}
    catch (failure) {
      const code = failure instanceof Error ? failure.message : '';
      if (code === '401' || code === '403') {
        setSession({available:true,signedIn:false});setSnapshot(undefined);
        setStatus('Sign in again to access your settings.');
      } else if (code === '409') {
        setSnapshot(undefined);
        setStatus('The backup changed on another device. Load it again before saving.');
      } else {
        setStatus('Aurea couldn’t complete the request. Your local settings are still available.');
      }
    } finally {setBusy(false);}
  }

  async function load() {
    const next:Snapshot = await request('preferences');
    setSnapshot(next);
    return next;
  }

  const row=(id:string, label:string, handler:()=>void)=><FocusButton
    id={'account-'+id} group="phone-modal" label={label} disabled={busy} onPress={handler}
    style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:8}}>
    <Icon name="settings" size={19}/><Text style={{color:'#e9eeff',fontSize:16}}>{label}</Text>
  </FocusButton>;

  return <View style={{gap:6,marginVertical:12}}>
    <Text accessibilityRole="header" style={{color:'#fff',fontWeight:'600',fontSize:19}}>X-Center ID</Text>
    {session.signedIn ? <>
      {session.name && <Text style={{color:'#d6e3ff'}}>{session.name}</Text>}
      <Text style={{color:'#d6e3ff'}}>Save or restore the remote layout and touchpad setting.</Text>
      {row('load','Load settings backup',()=>void run(async()=>{
        const saved=await load();
        setRemove(false);
        setStatus(saved.preferences ? 'Backup loaded. Review it before restoring or replacing it.' : 'No settings backup yet.');
      }))}
      {snapshot?.preferences && <>
        <Text style={{color:'#d6e3ff'}}>Saved layout {snapshot.preferences.view} · Touchpad {snapshot.preferences.touchpad?'on':'off'}</Text>
        {row('restore','Restore saved settings',()=>{
          const saved=snapshot.preferences;
          if(!saved)return;
          restore({view:saved.view,touchpad:saved.touchpad});
          setStatus('Settings restored on this device.');
        })}
      </>}
      {snapshot && row('save',snapshot.preferences?'Replace backup with this layout':'Save this layout',()=>void run(async()=>{
        await request('preferences',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':'"'+snapshot.revision+'"'},body:JSON.stringify({schema:1,...layout})});
        await load();
        setStatus('Remote settings saved.');
      }))}
      {snapshot?.preferences && row('remove',remove?'Confirm backup deletion':'Delete settings backup',()=>{
        if(!remove){setRemove(true);setStatus('Delete the online backup? This device keeps its settings.');return;}
        void run(async()=>{
          await request('preferences',{method:'DELETE',headers:{'If-Match':'"'+snapshot.revision+'"'}});
          setRemove(false);setSnapshot(undefined);setStatus('Backup deleted.');
        });
      })}
      {row('dashboard','Manage X-Center ID',()=>{window.open('https://id.xcenter.it','_blank','noopener,noreferrer');})}
      {row('logout','Sign out of Aurea',()=>void run(async()=>{
        await request('logout',{method:'POST'});
        setSession({available:true,signedIn:false});setSnapshot(undefined);setRemove(false);
      }))}
    </> : <form action="/account/start" method="post">
      <button type="submit" style={{padding:'12px 16px',borderRadius:10}}>Sign in with X-Center ID</button>
    </form>}
    <Text accessibilityLiveRegion="polite" style={{color:'#d6e3ff'}}>{status}</Text>
  </View>;
}
