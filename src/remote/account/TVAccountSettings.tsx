// SPDX-License-Identifier: AGPL-3.0-only
import React, {useEffect, useRef, useState} from 'react';
import {Image, Text, View} from 'react-native';
import {FocusButton} from '../../components/FocusButton';
import {Icon} from '../../components/Icon';
import type {Launcher} from '../../launcher/types';
import {wallpapers} from '../../model/catalog';

const root = 'https://aurea.xcenter.it/account/';
type Approval = {id:string; code:string; proof:string; expiresIn:number; qr?:string};
type Account = {session:string; name?:string};
type Appearance = {schema:1; language:'en'|'it'; wallpaper:string; motion:boolean;musicTint:boolean;glass:boolean;blur:boolean};
type Backup = {revision:string; preferences:Appearance|null};

async function request(path:string, init?:RequestInit) {
  const response=await fetch(root+path,{credentials:'omit',redirect:'error',cache:'no-store',...init});
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(String(response.status));
  }
  return response.json();
}

export function TVAccountSettings({demo, account, setAccount, t}: {
  demo:Launcher; account?:Account; setAccount:(account?:Account)=>void; t:(value:string)=>string;
}) {
  const [available,setAvailable]=useState(false);
  const [approval,setApproval]=useState<Approval>();
  const [backup,setBackup]=useState<Backup>();
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [remove,setRemove]=useState(false);
  const active=useRef(true);
  const [invitation,setInvitation]=useState(0);
  const [remotes,setRemotes]=useState<{id:string;added:number}[]>([]);
  const [revoke,setRevoke]=useState<string>();
  const refreshRemotes=async()=>{
    const result=await demo.execute('accountRemotes');
    if(!Array.isArray(result.remotes))throw new Error('remote_unavailable');
    setRemotes(result.remotes.filter(remote=>typeof remote?.id==='string'&&Number.isFinite(remote.added)));
  };

  useEffect(()=>{
    active.current=true;
    const signal=new AbortController();
    void request('session',{signal:signal.signal}).then(({available})=>setAvailable(available===true)).catch(()=>{});
    return()=>{active.current=false;signal.abort();};
  },[]);
  useEffect(()=>{
    if(!approval)return;
    const signal=new AbortController();
    const body=JSON.stringify({id:approval.id,proof:approval.proof});
    const headers={'Content-Type':'application/json'};
    const expires=Date.now()+approval.expiresIn*1000;
    let timer:ReturnType<typeof setTimeout>;
    let pickedUp=false;
    const poll=async()=>{
      try {
        if(Date.now()>=expires)throw new Error('expired');
        const result=await request('device/pickup',{method:'POST',headers,body,signal:signal.signal});
        if(signal.signal.aborted)return;
        if(typeof result.session==='string'){
          pickedUp=true;
          setAccount({session:result.session,name:result.name});
          setApproval(undefined);
          setStatus('TV linked to X-Center ID.');
        }else{
          timer=setTimeout(()=>void poll(),3000);
        }
      }catch{
        if(!signal.signal.aborted){setApproval(undefined);setStatus('Sign-in ended. Request a new code to try again.');}
      }
    };
    void poll();
    return()=>{
      clearTimeout(timer);signal.abort();
      if(!pickedUp)void request('device/cancel',{method:'POST',headers,body}).catch(()=>{});
    };
  },[approval,setAccount]);

  async function run(action:()=>Promise<void>) {
    setBusy(true);setStatus('');
    try{await action();}
    catch(error){
      if(!active.current)return;
      const code=error instanceof Error?error.message:'';
      if(code==='401'||code==='403'){setAccount();setBackup(undefined);setStatus('Sign in again on this TV.');}
      else if(code==='409'){setBackup(undefined);setStatus('The backup changed. Load it again before saving.');}
      else setStatus('Aurea couldn’t complete the request. Your local settings are still available.');
    }finally{if(active.current)setBusy(false);}
  }

  const start=()=>run(async()=>{
    const material=await demo.execute('accountChallenge');
    if(typeof material.proof!=='string'||typeof material.challenge!=='string')throw new Error('unavailable');
    const result=await request('device/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challenge:material.challenge})});
    const qr=await demo.execute('accountQr',{code:result.code}).catch(()=>({qr:undefined}));
    const awaiting={id:result.id,code:result.code,expiresIn:result.expiresIn,proof:material.proof,qr:typeof qr.qr==='string'?qr.qr:undefined};
    if(active.current)setApproval(awaiting);
    else void request('device/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:awaiting.id,proof:awaiting.proof})}).catch(()=>{});
  });

  const auth=()=>({Authorization:'Bearer '+account?.session});
  const cancelInvitation=async()=>{
    await demo.execute('accountInviteCancel');
    setInvitation(0);
    await request('device/invitations',{method:'DELETE',headers:auth()});
  };
  useEffect(()=>{
    if(!invitation)return;
    const timer=setTimeout(()=>setInvitation(0),Math.max(0,invitation-Date.now()));
    return()=>clearTimeout(timer);
  },[invitation]);
  const shareInvitation=()=>run(async()=>{
    const pending=await demo.execute('accountInvite');
    if(pending.error==='remote_unavailable'){
      setStatus('The hosted remote is starting. Try again in a moment.');
      return;
    }
    if(typeof pending.grant!=='string')throw new Error('invitation_unavailable');
    try{
      const result=await request('device/invitations',{method:'POST',
        headers:{...auth(),'Content-Type':'application/json'},
        body:JSON.stringify({peer:pending.peer,label:pending.label,device:pending.device,grant:pending.grant})});
      setInvitation(Date.now()+Math.min(90,Number(result.expiresIn))*1000);
      setStatus('On your remote, sign in to the same account and choose Find approved TVs.');
    }catch(error){
      await demo.execute('accountInviteCancel');
      throw error;
    }
  });
  const load=async()=>{
    const next:Backup=await request('device/preferences',{headers:auth()});
    setBackup(next);
    return next;
  };
  const text=(value:string)=><Text style={{color:'#d6e3ff',fontSize:18}}>{t(value)}</Text>;
  const row=(id:string,label:string,action:()=>void)=><FocusButton id={'tv-account-'+id} group="modal" label={t(label)}
    onPress={action} disabled={busy} style={{minHeight:48,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:10}}>
    <Icon name="settings" size={22}/>{text(label)}
  </FocusButton>;

  return <View style={{gap:10,paddingVertical:10}}>
    {!available ? text('Account sync is unavailable on this TV.') :
      approval ? <>
        {text('Visit id.xcenter.it/device and enter this code, or scan it with your phone.')}
        {text(approval.code)}
        {approval.qr&&<Image source={{uri:approval.qr}} style={{height:180,width:180}} accessibilityLabel={t('X-Center ID sign-in code')}/>}
        {row('cancel','Cancel sign-in',()=>{setApproval(undefined);setStatus('');})}
      </> : account ? <>
        {account.name&&text(account.name)}
        {text('Sync TV appearance and language. HDMI mappings and remote credentials stay on this TV.')}
        {row('load','Load settings backup',()=>void run(async()=>{
          const saved=await load();setRemove(false);setStatus(saved.preferences?'Backup loaded. Review it before restoring or replacing it.':'No settings backup yet.');
        }))}
        {backup?.preferences&&text(t('Saved wallpaper')+' '+backup.preferences.wallpaper+' · '+backup.preferences.language)}
        {backup?.preferences&&row('restore','Restore saved settings',()=>void run(async()=>{
          const saved=backup.preferences;
          if(!saved||!wallpapers.some(wallpaper=>wallpaper.id===saved.wallpaper))throw new Error('unknown_wallpaper');
          const {language,wallpaper,motion,musicTint,glass,blur}=saved;
          await demo.execute('preferences',{language,wallpaper,motion,musicTint,glass,blur});
          setStatus('Settings restored on this device.');
        }))}
        {backup&&row('save',backup.preferences?'Replace backup with this TV’s settings':'Save this TV’s settings',()=>void run(async()=>{
          const {language,wallpaper,motion,musicTint,glass,blur}=demo.prefs;
          const data={schema:1,language,wallpaper,motion,musicTint:musicTint===true,glass,blur:blur!==false};
          await request('device/preferences',{method:'PUT',headers:{...auth(),'Content-Type':'application/json','If-Match':'"'+backup.revision+'"'},body:JSON.stringify(data)});
          await load();setStatus('TV settings saved.');
        }))}
        {backup?.preferences&&row('remove',remove?'Confirm backup deletion':'Delete settings backup',()=>{
          if(!remove){setRemove(true);setStatus('Delete the online backup? This TV keeps its settings.');return;}
          void run(async()=>{
            await request('device/preferences',{method:'DELETE',headers:{...auth(),'If-Match':'"'+backup.revision+'"'}});
            setBackup(undefined);setRemove(false);setStatus('Backup deleted.');
          });
        })}
        {text('Allow one remote signed in to this account to pair for the next 90 seconds.')}
        {invitation ? row('cancel-invite','Close pairing invitation',()=>void run(async()=>{
          await cancelInvitation();setStatus('Pairing invitation closed.');
        })) : row('open-invite','Allow a remote to pair',()=>void shareInvitation())}
        {row('logout','Sign out of Aurea',()=>void run(async()=>{
          await demo.execute('accountInviteCancel');
          setInvitation(0);
          await request('device/logout',{method:'POST',headers:auth()});setAccount();setBackup(undefined);
        }))}
      </> : row('link','Sign in with X-Center ID',()=>void start())}
    {row('list-remotes','Manage account-paired remotes',()=>void run(async()=>{
      await refreshRemotes();
      setStatus('Choose a remote to revoke its access to this TV.');
    }))}
    {remotes.map((remote,index)=>{
      const label=t('Remote')+' '+(index+1)+' · '+new Date(remote.added).toLocaleString(demo.prefs.language);
      return <React.Fragment key={remote.id}>{row('revoke-'+remote.id,
        revoke===remote.id?t('Confirm revoke')+' · '+label:label,()=>{
          if(revoke!==remote.id){setRevoke(remote.id);return;}
          void run(async()=>{
            const result=await demo.execute('accountRemoteRevoke',{id:remote.id});
            if(result.accepted!==true)throw new Error('revocation_failed');
            await refreshRemotes();setRevoke(undefined);setStatus('Remote access revoked.');
          });
        })}</React.Fragment>;
    })}
    {!!status&&<View accessibilityLiveRegion="polite">{text(status)}</View>}
  </View>;
}
