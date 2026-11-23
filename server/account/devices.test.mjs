// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';
import {test} from 'node:test';
import {createDeviceLogins} from './devices.mjs';

function createFixture() {
  let approve;
  let reject;
  const login = createDeviceLogins({
    async beginDevice() {
      return {
        code:'ABC123', verification:'https://id.xcenter.it/device?code=ABC123', expiresIn:30,
        complete:signal=>new Promise((resolve, fail)=>{
          approve=resolve;reject=fail;
          signal.addEventListener('abort',()=>fail(Error('canceled')),{once:true});
        }),
      };
    },
  });
  const proof = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(proof).digest('base64url');
  return {login,proof,challenge,approve:account=>approve(account),reject:()=>reject(Error('denied'))};
}

test('device authorizations require the original proof, then complete only once', async () => {
  const {login,proof,challenge,approve}=createFixture();
  const {id,status, ...publicValues}=await login.begin(challenge);
  assert.equal(status,200);
  assert.deepEqual(Object.keys(publicValues).sort(),['code','expiresIn','verification']);
  assert.deepEqual(login.pickup(id,proof),{status:202});
  assert.equal(login.pickup(id,randomBytes(32).toString('base64url')).status,403);
  const account = {sub:'user', accessToken:'issuer-private'};
  approve(account);
  await Promise.resolve();
  assert.deepEqual(login.pickup(id,proof),{status:200,account});
  assert.equal(login.pickup(id,proof).status,403);
});

test('canceled and denied device authorizations cannot become sessions', async () => {
  const {login,proof,challenge,reject}=createFixture();
  assert.equal((await login.begin('invalid')).status,400);
  const canceled=await login.begin(challenge);
  assert.equal(login.pickup(canceled.id,proof,true).status,200);
  assert.equal(login.pickup(canceled.id,proof).status,403);
  const denied=await login.begin(challenge);
  reject();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(login.pickup(denied.id,proof).error,'device_login_denied');
});
