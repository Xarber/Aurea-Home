// SPDX-License-Identifier: AGPL-3.0-only
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {createHmac}=require('node:crypto');
const {AureaClient}=require('./client.cjs');
const key=Buffer.alloc(32,99);
const epoch='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const sign=(...parts)=>createHmac('sha256',key).update(parts.join('\n')).digest('base64url');
const encode=data=>Buffer.from(JSON.stringify(data)).toString('base64url');

test('the Homebridge client sends a scoped signed request and verifies the reply',async()=>{
  const client=new AureaClient('http://192.168.1.31:8080',key.toString('base64url'),async(url,options)=>{
    if(url.endsWith('/challenge'))return Response.json({epoch});
    assert.equal(url,'http://192.168.1.31:8080/api/automation');
    assert.equal(options.redirect,'error');
    const {platform,timestamp,nonce,body,signature}=JSON.parse(options.body);
    assert.equal(platform,'homebridge');
    assert.equal(JSON.parse(options.body).epoch,epoch);
    assert.equal(signature,sign('aurea-automation-request-v1',platform,epoch,timestamp,nonce,body));
    assert.deepEqual(JSON.parse(Buffer.from(body,'base64url')),{action:'volume',value:42});
    const reply=encode({accepted:true});
    return Response.json({body:reply,signature:sign('aurea-automation-response-v1',platform,nonce,reply)});
  });
  assert.deepEqual(await client.request('volume',{value:42}),{accepted:true});
});

test('refuses public hosts, redirected requests and forged response signatures',async()=>{
  assert.throws(()=>new AureaClient('http://1.1.1.1',key.toString('base64url')),/local IPv4/);
  const client=new AureaClient('http://10.0.0.2',key.toString('base64url'),async url=>url.endsWith('/challenge')?Response.json({epoch}):
    Response.json({body:encode({accepted:true}),signature:'a'.repeat(43)}));
  await assert.rejects(client.request('state'),/could not be verified/);
});
