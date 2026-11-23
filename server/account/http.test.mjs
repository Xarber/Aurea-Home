// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {test} from 'node:test';
import {accountHandler} from './http.mjs';

test('web account verifies callback ownership and scopes settings to the signed-in account', async context => {
  const records = new Map();
  let state = 0;
  let exchanges = 0;
  const origin = 'https://aurea.xcenter.it';
  const identity = {
    async begin() {
      return {state:String(++state), url:'https://id.xcenter.it/authorize', nonce:'nonce', verifier:'verifier'};
    },
    async complete(query) {
      exchanges++;
      const user = new URLSearchParams(query).get('code');
      return {sub:user, name:user, expiresIn:60, accessToken:'isolated-'+user};
    },
    async preferences(session, method, revision, data) {
      const key = session.sub;
      const record = records.get(key);
      if (method === 'GET') return record ?? {status:404};
      if (revision !== String(record?.revision ?? 0)) return {status:412};
      if (method === 'DELETE') records.delete(key);
      else records.set(key, {status:200, revision:(record?.revision ?? 0)+1, data});
      return {status:204};
    },
  };
  const server = createServer(accountHandler({identity, origin}));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());
  const base = 'http://127.0.0.1:' + server.address().port + '/account/';
  const call = (path, init) => fetch(base + path, {redirect:'manual', ...init});
  const value = response => response.headers.getSetCookie().at(-1).split(';')[0];

  assert.equal((await call('preferences')).status, 401);
  assert.equal((await call('start',{method:'POST',headers:{Origin:'https://other.example'}})).status, 403);

  async function signIn(user, expectedState) {
    const start = await call('start',{method:'POST',headers:{Origin:origin}});
    assert.equal(start.status, 303);
    assert.match(start.headers.getSetCookie()[0], /Secure; HttpOnly; SameSite=Lax/);
    const callback = 'callback?state='+expectedState+'&code='+user;
    assert.equal((await call(callback)).status, 403);
    const headers = {cookie:value(start)};
    assert.equal((await call('callback?state=wrong&code='+user,{headers})).status, 403);
    const finish = await call(callback,{headers});
    assert.equal(finish.status, 303);
    assert.equal(finish.headers.get('location'), '/?remote=1');
    assert.equal((await call(callback,{headers})).status, 403);
    return value(finish);
  }
  const alice = await signIn('alice',1);
  const bob = await signIn('bob',2);
  assert.equal(exchanges,2);

  const headers = {Origin:origin,cookie:alice,'If-Match':'"0"','Content-Type':'application/json'};
  const layout = {schema:1,view:'full',touchpad:true};
  const put = body => call('preferences',{method:'PUT',headers,body:JSON.stringify(body)});
  assert.equal((await put({...layout, token:'never sync this'})).status,400);
  assert.equal((await put(layout)).status,200);
  assert.equal((await put(layout)).status,409);
  const own = await call('preferences',{headers:{cookie:alice}});
  assert.deepEqual(await own.json(),{revision:'1',preferences:layout});
  assert.equal(own.headers.get('cache-control'),'no-store');
  assert.deepEqual(await (await call('preferences',{headers:{cookie:bob}})).json(),{revision:'0',preferences:null});
  assert.equal((await call('preferences',{method:'DELETE',headers:{...headers,'If-Match':'"1"'}})).status,200);
  assert.equal((await call('logout',{method:'POST',headers})).status,200);
  assert.equal((await call('preferences',{headers:{cookie:alice}})).status,401);
});
