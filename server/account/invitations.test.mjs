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
