// SPDX-License-Identifier: AGPL-3.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import tls from 'node:tls';
import crypto from 'node:crypto';
import ts from 'typescript';
import forge from 'node-forge';
const require=createRequire(import.meta.url),store=new Map();
function load(path){const source=readFileSync(new URL(path,import.meta.url),'utf8'),output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,module={exports:{}};const adapter=name=>{
 if(name==='react-native')return {Platform:{OS:'ios',isTV:false}};
 if(name==='expo')return {requireOptionalNativeModule:()=>({randomSeed:async()=>crypto.randomBytes(64).toString('base64')})};
 if(name==='expo-secure-store')return {getItemAsync:async key=>store.get(key)??null,setItemAsync:async(key,value)=>{store.set(key,value);}};
 if(name==='react-native-tcp-socket')return {connectTLS(options,connected){assert.match(options.key,/^-----BEGIN RSA PRIVATE KEY-----/,'iOS Security imports PKCS#1, not the stored PKCS#8 wrapper');const socket=tls.connect(options,connected),original=socket.getPeerCertificate.bind(socket);socket.getPeerCertificate=async()=>{await new Promise(resolve=>setTimeout(resolve,20));return original();};return socket;}};
 if(name==='./wire')return load('../../src/remote/system/wire.ts');
 if(name==='../validation')return load('../../src/remote/validation.ts');
 return require(name);
 };new Function('require','exports','module',output)(adapter,module.exports,module);return module.exports;}
const {bytes,fields,integer,join,nested,readVarint,varint}=load('../../src/remote/system/wire.ts');
const frame=message=>Buffer.from(join(varint(message.length),message));
function receive(socket,consume){let pending=Buffer.alloc(0);socket.on('data',data=>{pending=Buffer.concat([pending,data]);while(pending.length){const head=readVarint(pending);if(!head||pending.length<head[1]+head[0])return;const message=fields(pending.subarray(head[1],head[1]+head[0]));pending=pending.subarray(head[1]+head[0]);consume(message);}});socket.on('error',()=>{});}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let i=0;i<150;i++){if(check())return;await pause(10);}assert.fail('protocol result did not arrive');}

test('native implementation pairs over real TLS, negotiates early frames and sends direct buttons and microphone PCM',async()=>{
 const pair=forge.pki.rsa.generateKeyPair(2048),cert=forge.pki.createCertificate();cert.publicKey=pair.publicKey;cert.serialNumber='01';cert.validity.notBefore=new Date(Date.now()-1000);cert.validity.notAfter=new Date(Date.now()+86400000);cert.setSubject([{name:'commonName',value:'Test TV'}]);cert.setIssuer(cert.subject.attributes);cert.sign(pair.privateKey,forge.md.sha256.create());const options={key:forge.pki.privateKeyToPem(pair.privateKey),cert:forge.pki.certificateToPem(cert),requestCert:true,rejectUnauthorized:false};
 let code='',secretChecked=false,ping=false;const keys=[],audio=[],sockets=new Set();const send=(socket,message)=>socket.write(frame(message));const polo=(field,content=new Uint8Array())=>join(integer(1,2),integer(2,200),bytes(field,content));
 const pairing=tls.createServer(options,socket=>{sockets.add(socket);const own=forge.pki.certificateFromAsn1(forge.asn1.fromDer(socket.getPeerCertificate().raw.toString('binary'))).publicKey;const h=forge.md.sha256.create();for(let value of [own.n.toString(16),own.e.toString(16),pair.publicKey.n.toString(16),pair.publicKey.e.toString(16),'beef']){if(value.length%2)value='0'+value;h.update(forge.util.hexToBytes(value));}const digest=h.digest().getBytes();code=digest.charCodeAt(0).toString(16).padStart(2,'0')+'beef';receive(socket,message=>{if(message.has(10))send(socket,polo(11));else if(message.has(20))send(socket,polo(20));else if(message.has(30))send(socket,polo(31));else if(message.has(40)){assert.deepEqual(Buffer.from(nested(message,40).get(1)),Buffer.from(digest,'binary'));secretChecked=true;send(socket,polo(41));}});});
 const control=tls.createServer(options,socket=>{sockets.add(socket);receive(socket,message=>{if(message.has(1))send(socket,bytes(2,integer(1,123)));else if(message.has(2)){send(socket,bytes(40,integer(1,1)));send(socket,bytes(8,integer(1,42)));}else if(message.has(9)){assert.equal(nested(message,9).get(1),42);ping=true;}else if(message.has(10)){const code=nested(message,10).get(1);keys.push(code);if(code===84)send(socket,bytes(30,integer(1,7)));}else if(message.has(31))audio.push(Buffer.from(nested(message,31).get(2)));});send(socket,bytes(1,integer(1,123)));});
 const client=load('../../src/remote/system/nativeClient.ts').nativeSystem;
 try{
  await new Promise(resolve=>pairing.listen(6467,'127.0.0.1',resolve));await new Promise(resolve=>control.listen(6466,'127.0.0.1',resolve));await client.target('http://127.0.0.1');await client.pairBegin();assert.match(code,/^[a-f0-9]{6}$/);await client.pairFinish(code);assert.equal(secretChecked,true);assert.equal(client.state().ready,true);await until(()=>ping);await client.key('power');await until(()=>keys.includes(26));
  const session=await client.voice('voice_start',{});const publicKey=crypto.createPublicKey({key:Buffer.from(session.publicKey,'base64'),format:'der',type:'spki'}),aes=crypto.randomBytes(32),nonce=crypto.randomBytes(12),pcm=Buffer.alloc(1024,17),cipher=crypto.createCipheriv('aes-256-gcm',aes,nonce);cipher.setAAD(Buffer.from(session.id+':0'));const encrypted=Buffer.concat([cipher.update(pcm),cipher.final(),cipher.getAuthTag()]);const wrapped=crypto.publicEncrypt({key:publicKey,oaepHash:'sha256'},aes);await client.voice('voice_chunk',{id:session.id,sequence:0,nonce:nonce.toString('base64'),ciphertext:encrypted.toString('base64'),wrappedKey:wrapped.toString('base64')});await client.voice('voice_end',{id:session.id});await until(()=>audio.length>0);assert.equal(audio[0].length,8192);assert.deepEqual(audio[0].subarray(0,1024),pcm);assert.ok(audio[0].subarray(1024).every(value=>value===0));
 }finally{client.close();for(const socket of sockets)socket.destroy();await Promise.all([new Promise(resolve=>pairing.close(resolve)),new Promise(resolve=>control.close(resolve))]);}
});
