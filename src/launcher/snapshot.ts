// SPDX-License-Identifier: AGPL-3.0-only
import {weatherCity} from '../model/weather.ts';
import type { NativeSnapshot } from './types';
export function nativeSnapshot(value: Record<string, unknown>): NativeSnapshot {
  if (
    value.schema !== 1 ||
    !Array.isArray(value.catalog) ||
    value.catalog.length > 330
  )
    throw new Error('invalid_native_response');
  for (const entry of value.catalog)
    if (
      !entry ||
      typeof entry.id !== 'string' ||
      entry.id.length > 512 ||
      typeof entry.name !== 'string' ||
      ![
        'app',
        'hdmi',
        'live',
        'library',
        'inputs',
        'airplay',
        'settings',
      ].includes(entry.kind)
    )
      throw new Error('invalid_native_response');
  const prefs = value.preferences as NativeSnapshot['preferences'] | undefined;
  if (
    !prefs ||
    !Array.isArray(prefs.dock) ||
    prefs.dock.length !== 6 ||
    new Set(prefs.dock).size !== 6 ||
    prefs.dock.some(
      (id, index) => typeof id !== 'string' || (index < 5 && id === 'all'),
    ) ||
    !['en', 'it'].includes(prefs.language) ||
    typeof prefs.glass !== 'boolean' ||
    typeof prefs.motion !== 'boolean'
  )
    throw new Error('invalid_native_response');
  if (!value.music || !value.network || !value.paired || !value.build)
    throw new Error('invalid_native_response');
  prefs.dockSize=prefs.dockSize==='compact'||prefs.dockSize==='large'?prefs.dockSize:'standard';
  prefs.wallpaperClock=prefs.wallpaperClock==='minimal'||prefs.wallpaperClock==='stacked'?prefs.wallpaperClock:'off';
  prefs.navigationSound=prefs.navigationSound===true;
  prefs.startFocus=prefs.startFocus==='apps'||prefs.startFocus==='inputs'?prefs.startFocus:'dock';
  const installed=new Set(value.catalog.filter(entry=>entry.kind==='app').map(entry=>entry.id));
  prefs.hiddenApps=Array.isArray(prefs.hiddenApps)
    ?[...new Set(prefs.hiddenApps.filter(id=>installed.has(id)))].slice(0,256)
    :[];
  const folderIds=new Set<string>();
  prefs.folders=Array.isArray(prefs.folders)?prefs.folders.slice(0,12).flatMap(folder=>{
    if(!folder||typeof folder.id!=='string'||!/^[a-f0-9-]{36}$/.test(folder.id)||folderIds.has(folder.id)||
       typeof folder.name!=='string'||!folder.name.trim()||folder.name.length>40||!Array.isArray(folder.apps))return [];
    folderIds.add(folder.id);
    return [{id:folder.id,name:folder.name,apps:[...new Set(folder.apps.filter(id=>installed.has(id)))].slice(0,24)}];
  }):[];
  prefs.weatherCity=weatherCity(prefs.weatherCity);
  return value as unknown as NativeSnapshot;
}
