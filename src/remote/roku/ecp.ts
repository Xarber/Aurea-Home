// SPDX-License-Identifier: AGPL-3.0-only
import type {RemoteKey} from '../types';
import {RemoteError} from '../validation.ts';

type Request=(url:string,options:RequestInit)=>Promise<Response>;
export type RokuTarget={address:string;id:string;name:string;volume:boolean;power:boolean};

const mapping:Partial<Record<RemoteKey,string>>={
  home:'Home',back:'Back',up:'Up',down:'Down',left:'Left',right:'Right',ok:'Select',
  playpause:'Play',rewind:'Rev',fastforward:'Fwd',menu:'Info',previous:'InstantReplay',
  volumeup:'VolumeUp',volumedown:'VolumeDown',mute:'VolumeMute',power:'PowerOff',
};

export function rokuAddress(input:string){
  const match=/^(?:http:\/\/)?(\d{1,3}(?:\.\d{1,3}){3})(?::8060)?\/?$/.exec(input.trim());
  if(!match)throw new RemoteError('invalid_address');
  const [a,b]=match[1]!.split('.').map(Number);
  const octets=match[1]!.split('.');
  if(octets.some(part=>Number(part)>255||String(Number(part))!==part)||
    !(a===10||a===172&&b!>=16&&b!<=31||a===192&&b===168))throw new RemoteError('local_network_only');
  return 'http://'+match[1]+':8060';
}

async function deviceBody(response:Response){
  const max=32768;
  if(Number(response.headers.get('content-length'))>max||!response.body)throw new RemoteError('invalid_response');
  const decoder=new TextDecoder();
  const reader=response.body.getReader();
  let total=0,text='';
  try{
    while(true){
      const chunk=await reader.read();
      if(chunk.done)break;
      total+=chunk.value.byteLength;
      if(total>max)throw new RemoteError('invalid_response');
      text+=decoder.decode(chunk.value,{stream:true});
    }
    return text+decoder.decode();
  }finally{
    await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
}

export function parseRokuInfo(text:string,address:string):RokuTarget {
  if(text.length>32768||/<!/.test(text)||!/<device-info>[\s\S]*<\/device-info>\s*$/i.test(text))
    throw new RemoteError('invalid_response');
  const field=(element:string)=>new RegExp('<'+element+'>([^<>]{0,140})</'+element+'>','i').exec(text)?.[1]?.trim();
  const id=field('udn');
  if(!id||!/^[A-Za-z0-9_-]{16,128}$/.test(id))throw new RemoteError('invalid_response');
  const name=(field('user-device-name')||field('model-name')||'Roku')
    .replace(/&(amp|lt|gt|apos|quot);/g,(_,type:string)=>({amp:'&',lt:'<',gt:'>',apos:"'",quot:'"'}[type]??''))
    .replace(/[\p{Cc}\p{Cf}]/gu,'').slice(0,100);
  return {address,id,name:name||'Roku',volume:field('is-tv')==='true'||field('supports-audio-volume-control')==='true',
    power:field('is-tv')==='true'||field('supports-tv-power-control')==='true'};
}

export async function findRoku(input:string,request:Request,signal:AbortSignal){
  const address=rokuAddress(input);
  const response=await request(address+'/query/device-info',{signal,method:'GET',redirect:'error',credentials:'omit',cache:'no-store'});
  if(!response.ok||response.redirected)throw new RemoteError('connection_failed');
  return parseRokuInfo(await deviceBody(response),address);
}

export async function sendRokuKey(saved:RokuTarget,key:RemoteKey,request:Request,signal:AbortSignal){
  const wire=mapping[key];
  if(!wire)throw new RemoteError('unsupported');
  const target=await findRoku(saved.address,request,signal);
  if(signal.aborted)throw new RemoteError('disconnected');
  if(target.id!==saved.id)throw new RemoteError('device_changed');
  if(key==='power'&&!target.power||(['mute','volumeup','volumedown'].includes(key)&&!target.volume))
    throw new RemoteError('unsupported');
  const response=await request(target.address+'/keypress/'+wire,{method:'POST',redirect:'error',credentials:'omit',signal});
  if(response.status===403)throw new RemoteError('roku_controls_disabled');
  if(!response.ok||response.redirected)throw new RemoteError('connection_failed');
}
