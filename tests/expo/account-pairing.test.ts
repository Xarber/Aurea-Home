// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {acceptInvitation,getInvitations,singleAutomaticInvitation} from '../../src/remote/account/invitations.ts';

const tv={peer:'11111111-1111-4111-8111-111111111111',label:'Living room',automatic:true};
const guest={peer:'22222222-2222-4222-8222-222222222222',label:'Guest room'};

test('a single automatic offer may pair while ambiguous and manual offers wait for a selection',async()=>{
  const offers=await getInvitations(async()=>({televisions:[tv,guest,{peer:'invalid'}]}));
  assert.deepEqual(offers,[tv,guest]);
  assert.equal(singleAutomaticInvitation(offers)?.peer,tv.peer);
  assert.equal(singleAutomaticInvitation([guest]),undefined);
  assert.equal(singleAutomaticInvitation([tv,{...guest,automatic:true}]),undefined);
});

test('a claim must return the selected peer and a valid, separate TV credential grant',async()=>{
  const accept=acceptInvitation(async(_path,request)=>{
    assert.equal(request?.method,'POST');
    assert.deepEqual(JSON.parse(String(request?.body)),{peer:tv.peer});
    return {peer:tv.peer,device:guest.peer,grant:'A'.repeat(43)};
  },tv.peer);
  assert.equal((await accept).device,guest.peer);
  await assert.rejects(acceptInvitation(async()=>({peer:guest.peer,device:tv.peer,grant:'A'.repeat(43)}),tv.peer));
});
