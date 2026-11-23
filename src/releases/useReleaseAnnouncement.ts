// SPDX-License-Identifier: AGPL-3.0-only
import {useEffect,useRef,useState} from 'react';
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {announcementFor, currentRelease} from './history';

const key = 'aurea.release.acknowledged';
const read = async (name:string) => Platform.OS==='web' ? localStorage.getItem(name) : SecureStore.getItemAsync(name);
export const acknowledgeRelease = async (version:string) => {
  if (Platform.OS==='web') localStorage.setItem(key,version);
  else await SecureStore.setItemAsync(key,version);
};

export function useReleaseAnnouncement(enabled:boolean, introductionKey:string, busy:boolean, open:()=>void) {
  const [seen,setSeen] = useState<string>();
  const displayed = useRef(false);
  const current = currentRelease.version;
  useEffect(()=>{
    if (!enabled || busy) return;
    let active = true;
    void Promise.all([read(introductionKey),read(key)]).then(([introduced,previous])=>{
      if (active && introduced==='1') setSeen(previous ?? 'unknown');
    }).catch(()=>{});
    return ()=>{active=false;};
  },[enabled,busy,introductionKey]);
  const release = enabled && seen ? announcementFor(current,seen) : undefined;
  useEffect(()=>{
    if (!release || busy || displayed.current) return;
    displayed.current=true;
    open();
  },[release,busy,open]);
  const dismiss = () => {
    if (!displayed.current) return;
    void acknowledgeRelease(current).catch(()=>{});
  };
  return {release,seen,dismiss};
}
