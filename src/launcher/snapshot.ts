// SPDX-License-Identifier: AGPL-3.0-only
import {validateWallpaperSchedule} from '../model/catalog.ts';
import {idleDelay,idleMode} from '../model/idle-display.ts';
import {localWallpaperPhotos,localWallpaperVideo,photoIntervals} from '../model/photo-wallpapers.ts';
import {cleanQuickActions} from '../model/quick-actions.ts';
import {quietHours} from '../model/quiet-hours.ts';
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
  prefs.focusSway=prefs.focusSway===true;
  prefs.navigationSound=prefs.navigationSound===true;
  prefs.quietHours=quietHours(prefs.quietHours);
  prefs.quickActions=cleanQuickActions(prefs.quickActions);
  prefs.startFocus=prefs.startFocus==='apps'||prefs.startFocus==='inputs'?prefs.startFocus:'dock';
  const installed=new Set(value.catalog.filter(entry=>entry.kind==='app').map(entry=>entry.id));
  prefs.kidsProfile=prefs.kidsProfile===true;
  prefs.kidsApps=prefs.kidsProfile&&Array.isArray(prefs.kidsApps)
    ?[...new Set(prefs.kidsApps.filter(id=>installed.has(id)))].slice(0,32):[];
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
  prefs.wallpaperSchedule=validateWallpaperSchedule(prefs.wallpaperSchedule);
  prefs.wallpaperScheduleEnabled=prefs.wallpaperScheduleEnabled===true;
  prefs.photoWallpapers=localWallpaperPhotos(prefs.photoWallpapers,prefs.householdProfile??'home');
  prefs.wallpaperVideo=localWallpaperVideo(prefs.wallpaperVideo,prefs.householdProfile??'home');
  prefs.wallpaperVideoEnabled=prefs.wallpaperVideoEnabled===true;
  prefs.photoWallpaperEnabled=prefs.photoWallpaperEnabled===true;
  prefs.photoWallpaperMinutes=photoIntervals.find(value=>value===prefs.photoWallpaperMinutes)??5;
  prefs.idleDisplay=idleMode(prefs.idleDisplay);
  prefs.idleDisplayMinutes=idleDelay(prefs.idleDisplayMinutes);
  prefs.remoteLayoutEnabled=prefs.remoteLayoutEnabled===true;
  prefs.weatherCity=weatherCity(prefs.weatherCity);
  if(typeof value.doorbell!=='string'||!/^event\.[a-z0-9_]{1,120}$/.test(value.doorbell))delete value.doorbell;
  return value as unknown as NativeSnapshot;
}
