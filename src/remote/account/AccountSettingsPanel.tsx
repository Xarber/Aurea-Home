// SPDX-License-Identifier: AGPL-3.0-only
import React, {useState} from 'react';
import {Text, View} from 'react-native';
import {FocusButton} from '../../components/FocusButton';
import {Icon} from '../../components/Icon';
import type {RemoteView} from '../remoteNavigation';

export type Layout = {view:RemoteView; touchpad:boolean};

export type PairApproved = (peer:string, device:string, grant:string)=>Promise<void>;
export type Session = {available:true; signedIn:boolean; name?:string};
type Snapshot = {revision:string; preferences:(Layout & {schema:1}) | null};

export function AccountSettingsPanel({layout, restore, session, request, onSignOut, onManage, signIn, pairApproved}: {
  layout:Layout;
  restore:(layout:Layout)=>void;
  session:Session;
  request:(path:string, init?:RequestInit)=>Promise<unknown>;
  onSignOut:()=>void;
  onManage:()=>void;
  signIn:React.ReactNode;
  pairApproved:PairApproved;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(false);
  const [televisions,setTelevisions] = useState<{peer:string;label:string}[]>([]);
  const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

  async function loadInvitations() {
    const result = await request('invitations') as {televisions?: unknown};
    const entries = Array.isArray(result.televisions) ? result.televisions.filter(tv=>
      typeof tv?.peer==='string' && uuid.test(tv.peer) && typeof tv.label==='string') : [];
    setTelevisions(entries);
    setStatus(entries.length ? 'Choose a television to pair.' : 'On the TV, open X-Center ID and choose Allow a remote to pair.');
  }

  async function claimInvitation(peer:string) {
    const result = await request('invitations',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({peer}),
    }) as {device?:string;peer?:string;grant?:string};
    setTelevisions([]);
    if(result.peer!==peer || !result.device || !uuid.test(result.device) ||
        !result.grant || !/^[A-Za-z0-9_-]{43}$/.test(result.grant)) throw new Error('invalid_invitation');
    await pairApproved(peer,result.device,result.grant);
    setStatus('Television paired.');
  }


  async function run(action:()=>Promise<void>) {
    setBusy(true);
    setStatus('');
    try {await action();}
    catch (failure) {
      const code = failure instanceof Error ? failure.message : '';
      if (code === '401' || code === '403') {
        onSignOut();setSnapshot(undefined);setTelevisions([]);
        setStatus('Sign in again to access your settings.');
      } else if (code === '404' || code === 'invitation_unavailable') {
        setTelevisions([]);
        setStatus('Open a new pairing invitation on the TV and try again.');
      } else if (code === '409') {
        setSnapshot(undefined);
        setStatus('The backup changed on another device. Load it again before saving.');
      } else {
        setStatus('Aurea couldn’t complete the request. Your local settings are still available.');
      }
    } finally {setBusy(false);}
  }

  async function load() {
    const next = await request('preferences') as Snapshot;
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
      {row('find-tvs','Find approved TVs',()=>void run(loadInvitations))}
      {televisions.map(tv=><React.Fragment key={tv.peer}>{row('approve-'+tv.peer,tv.label,()=>void run(()=>claimInvitation(tv.peer)))}</React.Fragment>)}
      {row('dashboard','Manage X-Center ID',onManage)}
      {row('logout','Sign out of Aurea',()=>void run(async()=>{
        await request('logout',{method:'POST'});
        onSignOut();setSnapshot(undefined);setTelevisions([]);setRemove(false);
      }))}
    </> : signIn}
    <Text accessibilityLiveRegion="polite" style={{color:'#d6e3ff'}}>{status}</Text>
  </View>;
}
