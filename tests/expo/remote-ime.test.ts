// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import test from 'node:test';
import {RemoteIme} from '../../src/remote/system/ime.ts';
import {bytes,fields,integer,join,nested} from '../../src/remote/system/wire.ts';

test('native IME uses focused field counters and places the cursor after inserted text',()=>{
 const ime=new RemoteIme();
 const signedMinusOne=Uint8Array.of(24,255,255,255,255,255,255,255,255,255,1);
 const field=join(signedMinusOne,integer(1,19));
 assert.equal(ime.receive(fields(bytes(20,join(bytes(1,integer(1,7)),bytes(2,field))))),true);
 assert.equal(ime.active,true);
 assert.equal(ime.revision,1);
 assert.equal(ime.receive(fields(bytes(21,join(integer(1,91),integer(2,92))))),false);
 const batch=nested(fields(ime.insert('à🙂')),21);
 assert.equal(batch.get(1),7);
 assert.equal(batch.get(2),19);
 const edit=nested(nested(batch,3),2);
 assert.equal(edit.get(1),3);
 assert.equal(edit.get(2),3);
 assert.equal(new TextDecoder().decode(edit.get(3) as Uint8Array),'à🙂');
 assert.equal(ime.receive(fields(bytes(22,bytes(2,integer(1,20))))),true);
 assert.equal(ime.revision,2);
 assert.equal(ime.receive(fields(bytes(20,bytes(1,integer(1,8))))),true);
 assert.equal(ime.active,false);
});

test('native IME can fall back to batch counters and drops them on reconnect',()=>{
 const ime=new RemoteIme();
 ime.receive(fields(bytes(21,join(integer(1,31),integer(2,12)))));
 assert.equal(nested(fields(ime.insert('x')),21).get(1),31);
 assert.equal(nested(fields(ime.insert('x')),21).get(2),12);
 ime.reset();
 assert.equal(ime.active,false);
 assert.equal(nested(fields(ime.insert('x')),21).get(2),0);
 ime.receive(fields(bytes(22,bytes(2,integer(1,5)))));
 assert.equal(ime.revision,2);
});
