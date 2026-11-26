// SPDX-License-Identifier: AGPL-3.0-only
import React, {useEffect, useRef, useState} from 'react';
import {Linking, Platform, Text, View} from 'react-native';
import {requireOptionalNativeModule} from 'expo';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import forge from 'node-forge';
import {FocusButton} from '../../components/FocusButton';
import {AccountSettingsPanel, type Layout, type Session, type PairApproved} from './AccountSettingsPanel';

const origin = 'https://aurea.xcenter.it';
const key = 'aurea.xcenter.phone.session';
const encodedToken = /^[A-Za-z0-9_-]{43}$/;
const signedOut:Session = {available:true,signedIn:false};

function base64url(binary:string) {
  return forge.util.encode64(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function accountRequest(path:string, init?:RequestInit, session?:string) {
  const response = await fetch(origin+'/account/phone/'+path,{
    ...init, credentials:'omit', redirect:'error', cache:'no-store',
    headers:{Accept:'application/json', ...(session ? {Authorization:'Bearer '+session} : {}), ...init?.headers},
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(String(response.status));
  }
  return response.json();
}

export async function remoteAccountRequest() {
  if(process.env.EXPO_PUBLIC_AUREA_ACCOUNTS_ENABLED!=='1')return;
  const token=await SecureStore.getItemAsync(key);
  if(!token||!encodedToken.test(token))return;
  return (path:string,init?:RequestInit)=>accountRequest(path,init,token);
}

function submit(path:string, payload:object, signal?:AbortSignal) {
  return accountRequest(path,{
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload), signal,
  });
}

export function AccountSettings({layout, restore, pairApproved}:{layout:Layout; restore:(layout:Layout)=>void; pairApproved:PairApproved}) {
  const [session,setSession] = useState<Session>();
  const [status,setStatus] = useState('');
  const [busy,setBusy] = useState(false);
  const bearer = useRef<string>(undefined);
  const attempt = useRef<AbortController>(undefined);
  const pending = useRef<{id:string;proof:string}>(undefined);
  const ios = Platform.OS === 'ios';
  const enabled = process.env.EXPO_PUBLIC_AUREA_ACCOUNTS_ENABLED === '1' && (ios || Platform.OS === 'android');

  useEffect(()=>{
    if (!enabled) return;
    const loading = new AbortController();
    void (async()=>{
      const saved = await SecureStore.getItemAsync(key);
      const token = saved && encodedToken.test(saved) ? saved : undefined;
      const result = await accountRequest('session',{signal:loading.signal},token);
      if (loading.signal.aborted || result.available !== true || typeof result.signedIn !== 'boolean') return;
      bearer.current = result.signedIn ? token : undefined;
      if (saved && !bearer.current) await SecureStore.deleteItemAsync(key);
      if (!loading.signal.aborted) setSession(result);
    })().catch(()=>{});
    return ()=>{
      loading.abort();
      attempt.current?.abort();
    };
  },[enabled]);

  function dismissIOS() {
    if (ios) {
      try {WebBrowser.dismissAuthSession();} catch { /* The sheet may already be closed. */ }
    }
  }

  function signOut() {
    bearer.current = undefined;
    setSession(signedOut);
    setStatus('');
    void SecureStore.deleteItemAsync(key).catch(()=>{});
  }

  async function signIn() {
    if (attempt.current) return;
    const controller = new AbortController();
    attempt.current = controller;
    setBusy(true);
    setStatus('Preparing secure sign-in…');
    const deadline = setTimeout(()=>controller.abort(), 300000);
    let completed = false;
    let closed = false;
    let open = false;
    try {
      const random = requireOptionalNativeModule<{randomSeed():Promise<string>}>('AureaMicrophone');
      if (!random) throw new Error('missing_secure_random');
      const seed = forge.util.decode64(await random.randomSeed());
      if (seed.length !== 64) throw new Error('invalid_random');
      const proof = base64url(seed.slice(0,32));
      const challenge = base64url(forge.md.sha256.create().update(proof).digest().getBytes());
      const handoff = await submit('start',{challenge,stay:true},controller.signal);
      if (typeof handoff.id !== 'string' || !encodedToken.test(handoff.id) ||
          handoff.browser !== origin+'/account/phone/browser?id='+handoff.id) throw new Error('invalid_browser_url');
      pending.current = {id:handoff.id,proof};
      setStatus(ios ? 'Finish signing in in the secure browser.' : 'Finish signing in, then return to Aurea.');
      const browser = ios ? WebBrowser.openAuthSessionAsync(handoff.browser) :
        WebBrowser.openBrowserAsync(handoff.browser,{createTask:false});
      open = true;
      void browser.then(result=>{
        if (result.type === 'cancel' || result.type === 'dismiss') closed = true;
      }).catch(()=>{closed = true;});
      while (!controller.signal.aborted && !closed) {
        const result = await submit('pickup',pending.current,controller.signal);
        if (controller.signal.aborted || closed) break;
        if (result.signedIn === true && typeof result.session === 'string' && encodedToken.test(result.session)) {
          await SecureStore.setItemAsync(key,result.session,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
          completed = true;
          bearer.current = result.session;
          setSession({available:true,signedIn:true,name:result.name});
          setStatus('');
          break;
        }
        await new Promise(resolve=>setTimeout(resolve,2000));
      }
      if (!completed) setStatus(closed ? 'Sign-in canceled.' : 'Sign-in ended. Try again when you’re ready.');
    } catch {
      setStatus(controller.signal.aborted ? 'Sign-in ended.' : 'Sign-in couldn’t finish. Try again when you’re ready.');
    } finally {
      clearTimeout(deadline);
      if (open) dismissIOS();
      const claim = pending.current;
      pending.current = undefined;
      if (!completed && claim) void submit('cancel',claim).catch(()=>{});
      attempt.current = undefined;
      setBusy(false);
    }
  }

  if (!session) return null;
  return <AccountSettingsPanel pairApproved={pairApproved} layout={layout} restore={restore} session={session}
    request={(path,init)=>accountRequest(path,init,bearer.current)}
    onSignOut={signOut}
    onSignIn={()=>void signIn()} signingIn={busy}
    signedOutDetails={<View style={{gap:6}}>
      {busy && <FocusButton id="account-cancel" group="phone-modal" label="Cancel sign-in"
        onPress={()=>{attempt.current?.abort();dismissIOS();}} style={{minHeight:44,justifyContent:'center',paddingHorizontal:8}}>
        <Text style={{color:'#e9eeff',fontSize:16}}>Cancel sign-in</Text>
      </FocusButton>}
      {!!status && <Text accessibilityLiveRegion="polite" style={{color:'#d6e3ff'}}>{status}</Text>}
    </View>}/>;
}
