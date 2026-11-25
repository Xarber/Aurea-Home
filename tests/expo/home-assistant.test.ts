// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {adjustedTemperature,isHomeEntity} from '../../src/model/home-assistant.ts';

test('Home Assistant only offers named supported entities',()=>{
  for(const id of ['light.kitchen','binary_sensor.door','climate.floor_1','scene.late_night','camera.living'])assert.equal(isHomeEntity(id),true);
  for(const id of ['script.anything','light.a/../../','media_player.audio','switch.a?unsafe'])assert.equal(isHomeEntity(id),false);
});

test('thermostat buttons stay inside the device limits and use its step',()=>{
  assert.equal(adjustedTemperature({min:18,max:23,target:21,step:.5},1),21.5);
  assert.equal(adjustedTemperature({min:18,max:23,target:22.8,step:.5},1),23);
  assert.equal(adjustedTemperature({min:18,max:23,target:23,step:.5},1),undefined);
  assert.equal(adjustedTemperature({target:21},-1),undefined);
});
