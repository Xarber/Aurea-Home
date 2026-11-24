// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {searchResults,weatherAccent,weatherEffect,weatherObservation,weatherPhase} from '../../src/model/weather.ts';

test('weather city search skips invalid results and rounds city coordinates',()=>{
  assert.deepEqual(searchResults({results:[
    {name:'Rome',admin1:'Lazio',country:'Italy',latitude:41.8912,longitude:12.5119},
    {name:'Invalid',latitude:91,longitude:0},
    {latitude:12,longitude:3},
  ]}),[{label:'Rome, Lazio, Italy',latitude:41.89,longitude:12.51}]);
});

test('Daylight follows sun times and ignores stale or invalid weather',()=>{
  const rise=1780000000,set=rise+43200;
  const sample=weatherObservation({current:{time:rise,weather_code:61},daily:{sunrise:[rise],sunset:[set]}});
  assert.ok(sample);
  assert.equal(weatherPhase(sample,rise-3800),0);
  assert.equal(weatherPhase(sample,rise),6);
  assert.equal(weatherPhase(sample,rise+1799),6);
  assert.equal(weatherPhase(sample,rise+1800),12);
  assert.equal(weatherPhase({...sample,sampledAt:set},set-1800),18);
  assert.equal(weatherPhase({...sample,sampledAt:set},set+3600),0);
  assert.equal(weatherPhase(sample,set),undefined);
  assert.ok(weatherAccent(sample.weatherCode));
  assert.equal(weatherAccent(0),undefined);
  assert.equal(weatherObservation({current:{time:rise,weather_code:null},daily:{sunrise:[rise],sunset:[set]}}),null);
});

test('weather overlays follow their observed condition',()=>{
  assert.equal(weatherEffect(95),'storm');
  assert.equal(weatherEffect(73),'snow');
  assert.equal(weatherEffect(45),'fog');
  assert.equal(weatherEffect(61),'rain');
  assert.equal(weatherEffect(0),undefined);
});
