// SPDX-License-Identifier: AGPL-3.0-only
export const photoIntervals=[1,5,15,60] as const;

export function photoIndex(count:number,minutes:number,now:number) {
  if(!Number.isInteger(count)||count<1||!Number.isFinite(now)||now<0)return -1;
  const interval=photoIntervals.find(value=>value===minutes)??5;
  return Math.floor(now/(interval*60000))%count;
}

export function localWallpaperPhotos(value:unknown,profile:string) {
  if(!Array.isArray(value)||!/^(?:home|[a-f0-9-]{36})$/.test(profile))return [];
  return [...new Set(value.filter((uri):uri is string=>typeof uri==='string'&&uri.length<512&&
    uri.startsWith('file:///')&&!uri.includes('..')&&
    new RegExp('/wallpaper-photos/'+profile+'/[a-f0-9-]{36}\\.jpg$').test(uri)))].slice(0,12);
}

export function localWallpaperVideo(value:unknown,profile:string) {
  if(typeof value!=='string'||value.length>512||!value.startsWith('file:///')||value.includes('..')||
    !/^(?:home|[a-f0-9-]{36})$/.test(profile))return undefined;
  return new RegExp('/wallpaper-videos/'+profile+'/clip\\.mp4\\?revision=[0-9]+$').test(value)?value:undefined;
}
