// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {countdownDate,daysUntil,displayCard,listRows,remainingTime,timerMinutes,parseWidgets,nextCollectionDate,estimatedMoonPhase} from '../../src/model/widgets.ts';

test('household timers handle partial seconds, expiry and long durations',()=>{
  assert.equal(remainingTime(1,0),'0:01');
  assert.equal(remainingTime(0,1),'0:00');
  assert.equal(remainingTime(3690000,0),'1:01:30');
  assert.equal(timerMinutes('60'),60);
  for(const invalid of ['-1','0','3.5','1441','Infinity'])assert.equal(timerMinutes(invalid),undefined);
});

test('invalid or unknown local widget records never enter rendering',()=>{
  const timer={id:'1',type:'timer',label:'Break',until:3600};
  assert.deepEqual(parseWidgets([timer,{...timer,until:Infinity},{type:'web'},{type:'clock',zone:5}]),[timer]);
});

test('date countdowns reject invalid dates and count calendar days',()=>{
  const today=new Date(2026,1,27,21).getTime();
  assert.equal(countdownDate('2026-02-31',today),undefined);
  assert.equal(countdownDate('2026-02-26',today),undefined);
  assert.equal(countdownDate('2026-03-01',today),'2026-03-01');
  assert.equal(daysUntil(new Date(2026,2,1).getTime(),today),2);
});

test('household notes preserve their text and reject oversized imports',()=>{
 const note={id:'1',type:'note',label:'Tomorrow',body:'Pick up groceries'};
 assert.deepEqual(parseWidgets([note,{...note,body:'x'.repeat(601)}]),[note]);
});


test('custom display cards accept bounded text rows only',()=>{
 assert.deepEqual(listRows('One\n\nTwo'),['One','Two']);
 assert.deepEqual(displayCard('{"schema":1,"label":"Weekend","rows":["Groceries at 10"]}'),
  {label:'Weekend',rows:['Groceries at 10']});
 assert.equal(displayCard('{"schema":1,"label":"Weekend","rows":[{"script":"x"}]}'),undefined);
 assert.equal(displayCard('{"schema":2,"label":"Weekend","rows":["Groceries"]}'),undefined);
});

test('collection reminders advance on local calendar dates',()=>{
  const today=new Date(2026,2,30,23).getTime();
  assert.equal(nextCollectionDate('2026-03-23',7,today),'2026-03-30');
  assert.equal(nextCollectionDate('2026-03-23',14,today),'2026-04-06');
  assert.equal(nextCollectionDate('2026-04-06',7,today),'2026-04-06');
  assert.equal(nextCollectionDate('2026-02-30',7,today),undefined);
  assert.equal(nextCollectionDate('2026-03-23',7,Infinity),undefined);
  const valid={id:'bin',label:'Paper',type:'collection',date:'2026-03-23',interval:7};
  assert.deepEqual(parseWidgets([valid,{...valid,interval:0},{...valid,date:'2026-02-30'}]),[valid]);
});

test('moon phase approximation is periodic and handles dates before its reference',()=>{
  const epoch=Date.parse('2026-01-18T19:52:00Z');
  const meanCycle=29.53059*86400000;
  assert.equal(estimatedMoonPhase(epoch),'New moon');
  assert.equal(estimatedMoonPhase(epoch+meanCycle/2),'Full moon');
  assert.equal(estimatedMoonPhase(epoch-meanCycle/4),'Last quarter');
  assert.equal(estimatedMoonPhase(NaN),undefined);
});
