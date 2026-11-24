// SPDX-License-Identifier: AGPL-3.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createInvitations} from './invitations.mjs';

test('account pairing requires a TV invitation and keeps the one-use grant private',()=>{
  let clock = 0;
  const action = createInvitations(()=>clock);
  const tv = {kind:'tv',sub:'alice',expiresAt:100000};
  const phone = {kind:'phone',sub:'alice'};
  const outsider = {kind:'phone',sub:'bob'};
  const invite = {peer:randomUUID(),device:randomUUID(),label:'Living room',grant:'A'.repeat(43)};
  assert.equal(action('remote',phone,'POST',invite).status,404);
  assert.equal(action('tv',tv,'POST',{...invite,label:'bad\nlabel'}).status,400);
  assert.equal(action('tv',tv,'POST',invite).status,200);
  assert.deepEqual(action('other',outsider,'GET').televisions,[]);
  assert.equal(action('other',outsider,'POST',invite).status,404);
  assert.deepEqual(action('remote',phone,'GET').televisions,[{peer:invite.peer,label:invite.label}]);
  assert.deepEqual(action('remote',phone,'POST',{peer:invite.peer}),{
    status:200,peer:invite.peer,device:invite.device,grant:invite.grant,
  });
  assert.equal(action('remote',phone,'POST',invite).status,404);
  action('tv',tv,'POST',invite);
  action('tv',tv,'DELETE');
  assert.equal(action('remote',phone,'POST',invite).status,404);
  action('tv',tv,'POST',invite);
  clock = 91000;
  assert.equal(action('remote',phone,'POST',invite).status,404);
});

test('automatic pairing advertises only to the linked account and cannot republish a consumed grant',()=>{
  let now=0;
  const action=createInvitations(()=>now);
  const tv={kind:'tv',sub:'viewer-a',expiresAt:200000};
  const phone={kind:'phone',sub:'viewer-a'};
  const web={kind:'web',sub:'viewer-a'};
  const outsider={kind:'phone',sub:'viewer-b'};
  const offer={peer:randomUUID(),device:randomUUID(),grant:'B'.repeat(43),label:'Aurea TV',automatic:true};
  assert.equal(action('tv',tv,'POST',offer).status,200);
  assert.deepEqual(action('other',outsider,'GET').televisions,[]);
  assert.deepEqual(action('web',web,'GET').televisions,[{peer:offer.peer,label:offer.label,automatic:true}]);
  assert.equal(action('other',outsider,'POST',{peer:offer.peer}).status,404);
  assert.equal(action('phone',phone,'POST',{peer:offer.peer}).grant,offer.grant);
  assert.equal(action('web',web,'POST',{peer:offer.peer}).status,404);
  assert.equal(action('tv',tv,'POST',offer).status,409);
  const next={...offer,grant:'C'.repeat(43)};
  assert.equal(action('tv',tv,'POST',next).status,200);
  action('tv',tv,'DELETE');
  assert.deepEqual(action('phone',phone,'GET').televisions,[]);
  assert.equal(action('tv',tv,'POST',next).status,200);
  now=91000;
  assert.equal(action('phone',phone,'POST',{peer:offer.peer}).status,404);
});
