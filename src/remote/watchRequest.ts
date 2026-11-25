// SPDX-License-Identifier: AGPL-3.0-only
import type {Session,Transport} from './types';
import {RemoteError} from './validation.ts';

/** Verify the saved identity before presenting its TV-local credential to a second device. */
export async function sendSavedWatchRequest(transport:Transport,session:Session,title:string,signal:AbortSignal,startsAt?:number) {
  try{
    if(signal.aborted)throw new RemoteError('disconnected');
    const content=title.trim();
    if(content.length<2||content.length>120||/[\p{Cc}\p{Cf}]/u.test(content))throw new RemoteError('invalid_watch_request');
    if(!session.id||!/^[A-Za-z0-9-]{16,128}$/.test(session.id)||
      !/^[A-Za-z0-9_-]{32}$/.test(session.token))throw new RemoteError('auth_required');
    const hello=await transport.rpc('hello',{},undefined,signal);
    if(signal.aborted)throw new RemoteError('disconnected');
    if(hello.id!==session.id)throw new RemoteError('device_changed');
    const result=await transport.rpc('watch_request',{title:content,...(startsAt!==undefined?{startsAt}:{})},session.token,signal);
    if(signal.aborted)throw new RemoteError('disconnected');
    if(result.accepted!==true||startsAt!==undefined&&result.startsAt!==startsAt)throw new RemoteError('invalid_response');
  }finally{
    transport.close?.();
  }
}
