// SPDX-License-Identifier: AGPL-3.0-only
import type {IconName} from './catalog';

export const quickActions={
  network:{label:'Network',icon:'wifi'},
  sound:{label:'Sound',icon:'volume'},
  remote:{label:'Remote',icon:'remote'},
  airplay:{label:'AirPlay',icon:'airplay'},
  wallpapers:{label:'Wallpapers',icon:'wallpaper'},
  watchNext:{label:'Keep Watching',icon:'film'},
  widgets:{label:'Household widgets',icon:'sun'},
  automations:{label:'Smart home',icon:'home'},
} as const satisfies Record<string,{label:string;icon:IconName}>;

export type QuickAction=keyof typeof quickActions;
export function cleanQuickActions(raw:unknown):QuickAction[]{
  if(!Array.isArray(raw))return [];
  return [...new Set(raw.filter((value):value is QuickAction=>
    typeof value==='string'&&Object.hasOwn(quickActions,value)))].slice(0,3);
}
