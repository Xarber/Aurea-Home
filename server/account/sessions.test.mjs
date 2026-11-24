// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {mkdtempSync,readdirSync,readFileSync,rmSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {test} from 'node:test';
import {createSessions,createSessionStore} from './sessions.mjs';

const fixture={sub:'alice',accessToken:'access-fixture',refreshToken:'refresh-fixture',expiresIn:600};
const renewed={...fixture,accessToken:'next-access-fixture',refreshToken:'next-refresh-fixture'};

test('renewal persists encrypted sessions, keeps clients scoped and rotates once across concurrent requests',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'aurea-sessions-'));
  t.after(()=>rmSync(directory,{force:true,recursive:true}));
  let now=1000,refreshes=0;
  const openStore=()=>createSessionStore({directory,keyMaterial:'fixture-key',clientId:'test-client',clock:()=>now});
  const identity={async refresh(session){
    assert.equal(session.refreshToken,fixture.refreshToken);
    refreshes++;
    return renewed;
  }};
  const original=createSessions(identity,openStore(),()=>now);
  const {id,ttl}=original.issue(fixture,'tv');
  assert.equal(ttl,14*24*60*60);
  const file=join(directory,readdirSync(directory)[0]);
  assert.equal(statSync(file).mode&0o777,0o600);
  assert.equal(readFileSync(file).includes(fixture.refreshToken),false);
  assert.equal(file.includes(id),false);
  const restarted=createSessions(identity,openStore(),()=>now);
  assert.equal(await restarted.use(id,'phone'),undefined);
  assert.equal((await restarted.use(id,'tv')).accessToken,fixture.accessToken);
  now+=550000;
  const concurrent=await Promise.all([restarted.use(id,'tv'),restarted.use(id,'tv')]);
  assert.equal(refreshes,1);
  assert.equal(concurrent[0],concurrent[1]);
  assert.equal(concurrent[0].accessToken,renewed.accessToken);
  assert.equal(createSessions(identity,openStore(),()=>now).read(id,'tv').refreshToken,renewed.refreshToken);
});

test('uncertain refresh invalidates a session and a late response cannot undo sign-out',async()=>{
  let now=1000, attempts=0, finish;
  const session=createSessions({async refresh(){
    attempts++;
    if(attempts===1)throw new Error('connection closed');
    return new Promise(resolve=>{finish=resolve;});
  }},undefined,()=>now);
  const first=session.issue(fixture,'web').id;
  const second=session.issue(fixture,'phone').id;
  now+=560000;
  assert.equal(await session.use(first,'web'),undefined);
  assert.equal(await session.use(first,'web'),undefined);
  assert.equal(attempts,1);
  const pending=session.use(second,'phone');
  session.delete(second);
  finish(renewed);
  assert.equal(await pending,undefined);
  assert.equal(session.read(second,'phone'),undefined);
});

test('short sessions expire without attempting renewal',async()=>{
  let now=1000;
  const session=createSessions({refresh(){assert.fail('short session requested a refresh');}},undefined,()=>now);
  const {id,ttl}=session.issue({...fixture,refreshToken:undefined},'web');
  assert.equal(ttl,600);
  now+=600000;
  assert.equal(await session.use(id,'web'),undefined);
});
