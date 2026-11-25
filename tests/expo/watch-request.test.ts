// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {sendSavedWatchRequest} from '../../src/remote/watchRequest.ts';
import type {Session,Transport} from '../../src/remote/types.ts';

const session:Session={address:'http://192.168.1.8',id:'aurea-tv-00000001',token:'a'.repeat(32)};

function transportFixture(id:string){
  const events:Array<[string,Record<string,unknown>,string|undefined]>=[];
  let closed=false;
  const transport:Transport={
    async rpc(op,value,token){
      events.push([op,value,token]);
      return op==='hello'?{id}:{accepted:true};
    },
    close(){closed=true;},
  };
  return {transport,events,isClosed:()=>closed};
}

test('passes the credential only after verifying the destination and sends once',async()=>{
  const fixture=transportFixture(session.id!);
  await sendSavedWatchRequest(fixture.transport,session,'  Arrival ',new AbortController().signal);
  assert.deepEqual(fixture.events,[['hello',{},undefined],['watch_request',{title:'Arrival'},session.token]]);
  assert.equal(fixture.isClosed(),true);
});

test('an address owned by a different TV never receives the credential or title',async()=>{
  const fixture=transportFixture('aurea-tv-00000002');
  await assert.rejects(sendSavedWatchRequest(fixture.transport,session,'Arrival',new AbortController().signal),/device_changed/);
  assert.deepEqual(fixture.events,[['hello',{},undefined]]);
  assert.equal(fixture.isClosed(),true);
});

test('cancellation after verification stops the protected request',async()=>{
  const controller=new AbortController();
  const fixture=transportFixture(session.id!);
  const read=fixture.transport.rpc;
  fixture.transport.rpc=async(...args)=>{const result=await read(...args);controller.abort();return result;};
  await assert.rejects(sendSavedWatchRequest(fixture.transport,session,'Arrival',controller.signal),/disconnected/);
  assert.equal(fixture.events.length,1);
  assert.equal(fixture.isClosed(),true);
});

test('unconfirmed sends fail without retrying and unverified legacy trust stays local',async()=>{
  const fixture=transportFixture(session.id!);
  const rpc=fixture.transport.rpc;
  fixture.transport.rpc=async(...args)=>{
    const reply=await rpc(...args);
    return args[0]==='watch_request'?{accepted:false}:reply;
  };
  await assert.rejects(sendSavedWatchRequest(fixture.transport,session,'Arrival',new AbortController().signal),/invalid_response/);
  assert.equal(fixture.events.length,2);
  const legacy=transportFixture(session.id!);
  await assert.rejects(sendSavedWatchRequest(legacy.transport,{...session,id:undefined},'Arrival',new AbortController().signal),/auth_required/);
  assert.deepEqual(legacy.events,[]);
});
