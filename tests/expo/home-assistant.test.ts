// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {adjustedPercentage,adjustedTemperature,adjustedVolume,calendarEventLabel,isHomeEntity} from '../../src/model/home-assistant.ts';

test('Home Assistant only offers named supported entities',()=>{
  for(const id of ['light.kitchen','binary_sensor.door','climate.floor_1','scene.late_night','camera.living','media_player.audio','fan.office','cover.blinds','event.doorbell','calendar.family'])assert.equal(isHomeEntity(id),true);
  for(const id of ['script.anything','light.a/../../','input_number.a','switch.a?unsafe','lock.front_door'])assert.equal(isHomeEntity(id),false);
});

test('thermostat buttons stay inside the device limits and use its step',()=>{
  assert.equal(adjustedTemperature({min:18,max:23,target:21,step:.5},1),21.5);
  assert.equal(adjustedTemperature({min:18,max:23,target:22.8,step:.5},1),23);
  assert.equal(adjustedTemperature({min:18,max:23,target:23,step:.5},1),undefined);
  assert.equal(adjustedTemperature({target:21},-1),undefined);
});


test('speaker volume bounds and unsupported source data',()=>{
  assert.equal(adjustedVolume(.42,1),.47);
  assert.equal(adjustedVolume(.02,-1),0);
  assert.equal(adjustedVolume(1,1),undefined);
  assert.equal(adjustedVolume(NaN,-1),undefined);
});

test('dimming, fan speed and cover controls preserve their bounded percentage',()=>{
  assert.equal(adjustedPercentage(1,-1,10,1),undefined);
  assert.equal(adjustedPercentage(1,1,10,1),11);
  assert.equal(adjustedPercentage(70,1,33.3),100);
  assert.equal(adjustedPercentage(40,1,NaN),50);
  assert.equal(adjustedPercentage(10,-1,25),0);
  assert.equal(adjustedPercentage('10',1),undefined);
});

test('calendar dates retain all-day labels and reject invalid response dates',()=>{
  assert.equal(calendarEventLabel({date:'2026-11-30'},'en-US'),'Nov 30');
  assert.equal(calendarEventLabel({date:'2026-11-31'},'en-US'),undefined);
  assert.equal(calendarEventLabel({time:'0'},'en-US'),undefined);
  assert.equal(calendarEventLabel({time:1e30},'en-US'),undefined);
});
