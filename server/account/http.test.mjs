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

test('phone handoff binds the browser and native proof and isolates the phone session', async context => {
  const {createHash, randomBytes} = await import('node:crypto');
  const proof = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(proof).digest('base64url');
  const origin = 'https://aurea.xcenter.it';
  let state = 0;
  let providerActive = true;
  const identity = {
    async validateSession() {return providerActive;},
    async begin() {return {state:String(++state),url:'https://id.xcenter.it/authorize'};},
    async complete() {return {sub:'alice',name:'Alice',expiresIn:60,accessToken:'fixture-token'};},
    async preferences(_session,_method,_revision,_data,profile) {
      assert.equal(profile,'remote-layout');
      return {status:404};
    },
  };
  const server = createServer(accountHandler({identity,origin}));
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  context.after(()=>server.close());
  const base = 'http://127.0.0.1:'+server.address().port;
  const fetchPath = (path,init) => fetch(base+path,{redirect:'manual',...init});
  const post = (path,payload,headers) => fetchPath('/account/phone/'+path,{
    method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(payload),
  });
  assert.equal((await post('start',{challenge},{Origin:origin})).status,403);
  const opened = await (await post('start',{challenge})).json();
  const url = new URL(opened.browser);
  assert.equal(url.origin,origin);
  assert.equal(url.pathname,'/account/phone/browser');
  assert.deepEqual([...url.searchParams],[['id',opened.id]]);
  const claim = {id:opened.id,proof};
  assert.equal((await post('pickup',claim)).status,202);
  assert.equal((await post('pickup',{...claim,proof:'A'.repeat(43)})).status,403);
  const browser = await fetchPath(url.pathname+url.search);
  assert.equal(browser.status,303);
  assert.equal((await fetchPath(url.pathname+url.search)).status,200);
  const cookie = browser.headers.getSetCookie().at(0).split(';')[0];
  assert.equal((await fetchPath('/account/callback?state=1&code=fixture')).status,403);
  const finish = await fetchPath('/account/callback?state=1&code=fixture',{headers:{cookie}});
  assert.equal(finish.status,200);
  assert.equal(finish.headers.getSetCookie().length,1);
  assert.match(await finish.text(),/return to the app/i);
  const [a,b] = await Promise.all([post('pickup',claim),post('pickup',claim)]);
  assert.deepEqual([a.status,b.status].sort(),[200,403]);
  const account = await (a.ok ? a : b).json();
  assert.equal(account.name,'Alice');
  assert.equal(account.accessToken,undefined);
  const auth = {Authorization:'Bearer '+account.session};
  assert.equal((await fetchPath('/account/device/preferences',{headers:auth})).status,401);
  assert.equal((await fetchPath('/account/preferences',{headers:auth})).status,401);
  assert.equal((await fetchPath('/account/phone/preferences',{headers:auth})).status,200);
  assert.deepEqual(await (await fetchPath('/account/phone/invitations',{headers:auth})).json(),{televisions:[]});
  providerActive = false;
  assert.equal((await fetchPath('/account/phone/invitations',{headers:auth})).status,401);
  assert.equal((await fetchPath('/account/phone/preferences',{headers:auth})).status,401);
  assert.equal((await post('logout',{},auth)).status,200);
  assert.equal((await fetchPath('/account/phone/preferences',{headers:auth})).status,401);
  const canceled = await (await post('start',{challenge})).json();
  assert.equal((await post('cancel',{id:canceled.id,proof})).status,200);
  assert.equal((await post('pickup',{id:canceled.id,proof})).status,403);
});

test('TV restore storage accepts only portable appearance and binds it to the redeemed owner', async context => {
  const {createHash,randomBytes} = await import('node:crypto');
  const origin='https://aurea.xcenter.it';
  const records=new Map();
  let owner='first';
  const identity={
    async validateSession(){return true;},
    async beginDevice(){
      const sub=owner;
      return {expiresIn:60,code:'DEMO-01',verification:'https://id.xcenter.it/device',
        async complete(){return {sub,name:sub,expiresIn:60,accessToken:'test-only'};}};
    },
    async preferences(session,method,revision,data,profile){
      assert.equal(profile,'tv-appearance');
      const stored=records.get(session.sub);
      if(method==='GET')return stored??{status:404};
      if(revision!==String(stored?.revision??0))return {status:412};
      records.set(session.sub,{status:200,revision:(stored?.revision??0)+1,data});
      return {status:204};
    },
  };
  const server=createServer(accountHandler({identity,origin}));
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  context.after(()=>server.close());
  const base='http://127.0.0.1:'+server.address().port+'/account/device/';
  async function signIn(){
    const proof=randomBytes(32).toString('base64url');
    const challenge=createHash('sha256').update(proof).digest('base64url');
    const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const begin=await post('start',{challenge});
    assert.equal(begin.status,200);
    const {id}=await begin.json();
    const verified=await post('pickup',{id,proof});
    assert.equal(verified.status,200);
    return verified.json();
  }
  const first=await signIn();
  owner='second';
  const second=await signIn();
  assert.notEqual(first.owner,second.owner);
  const headers={Authorization:'Bearer '+first.session,'If-Match':'"0"','Content-Type':'application/json'};
  const appearance={schema:1,language:'it',wallpaper:'silk',blur:false,glass:true,motion:false,musicTint:true};
  const save=(body)=>fetch(base+'preferences',{method:'PUT',headers,body:JSON.stringify(body)});
  for(const change of [{dock:['app']},{remoteLayoutEnabled:true},{language:'unknown'},{blur:'true'}]){
    assert.equal((await save({...appearance,...change})).status,400);
  }
  assert.equal((await save(appearance)).status,200);
  assert.equal((await save(appearance)).status,409);
  const load=(session)=>fetch(base+'preferences',{headers:{Authorization:'Bearer '+session}}).then(value=>value.json());
  assert.deepEqual(await load(first.session),{revision:'1',preferences:appearance});
  assert.deepEqual(await load(second.session),{revision:'0',preferences:null});
});
