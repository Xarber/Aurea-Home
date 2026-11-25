// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {idleDelay,idleMode,IdleWakeKey} from '../../src/model/idle-display.ts';

test('waking consumes the first remote press, including repeats and its release',()=>{
  const key=new IdleWakeKey();
  assert.equal(key.handle(true,'select','down'),true);
  assert.equal(key.handle(false,'select','down'),true);
  assert.equal(key.handle(false,'select','up'),true);
  assert.equal(key.handle(false,'select','down'),false);
  assert.equal(key.handle(true,'back','down'),true);
  key.reset();
  assert.equal(key.handle(false,'back','up'),false);
});

test('old and invalid preferences disable the idle cover and use the standard delay',()=>{
  assert.equal(idleMode(undefined),'off');
  assert.equal(idleMode('black'),'black');
  assert.equal(idleMode('hardware-power'),'off');
  assert.equal(idleDelay('30'),5);
  assert.equal(idleDelay(15),15);
});
