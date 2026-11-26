// SPDX-License-Identifier: AGPL-3.0-only
import React, {useEffect, useRef, useState} from 'react';
import {AccountSettingsPanel, type Session, type Layout, type PairApproved} from './AccountSettingsPanel';

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

export async function remoteAccountRequest() {
  if(location.origin==='https://aurea.xcenter.it')return request;
}

export function AccountSettings({layout, restore, pairApproved}:{layout:Layout; restore:(layout:Layout)=>void; pairApproved:PairApproved}) {
  const [session, setSession] = useState<Session>();
  const form=useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (location.origin !== 'https://aurea.xcenter.it') return;
    const controller = new AbortController();
    void request('session', {signal:controller.signal}).then(data => {
      if (data.available === true && typeof data.signedIn === 'boolean') setSession(data);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  if (!session) return null;
  return <AccountSettingsPanel pairApproved={pairApproved} layout={layout} restore={restore} session={session} request={request}
    onSignOut={()=>setSession({available:true,signedIn:false})}
    onSignIn={()=>form.current?.requestSubmit()}
    signedOutDetails={<form ref={form} action="/account/start?stay=1" method="post" hidden/>}/>;
}
