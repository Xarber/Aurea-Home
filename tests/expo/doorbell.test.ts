// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {doorbellObservation} from '../../src/model/doorbell.ts';

const now=Date.parse('2026-11-25T19:20:00Z');
const at=(offset:number)=>new Date(now+offset).toISOString();

test('alerts once for a recent new ring after a baseline, with time-zone normalization',()=>{
  assert.deepEqual(doorbellObservation(at(-5000),true,undefined,now),{stamp:now-5000,rang:false});
  assert.deepEqual(doorbellObservation('2026-11-25T20:20:00+01:00',true,now-5000,now),{stamp:now,rang:true});
  assert.deepEqual(doorbellObservation(at(0),true,now,now),{stamp:now,rang:false});
  assert.deepEqual(doorbellObservation(at(-1000),true,now,now),{stamp:now,rang:false});
});

test('ignores restored, malformed, future and non-ring events',()=>{
  assert.deepEqual(doorbellObservation('unknown',false,undefined,now),{stamp:0,rang:false});
  assert.deepEqual(doorbellObservation(at(-45000),true,0,now),{stamp:now-45000,rang:false});
  assert.deepEqual(doorbellObservation(at(-1000),false,0,now),{stamp:now-1000,rang:false});
  assert.equal(doorbellObservation('unavailable',true,0,now),undefined);
  assert.equal(doorbellObservation(at(6000),true,0,now),undefined);
});
