// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateWallpaperSchedule} from '../../src/model/catalog.ts';
import {daylightPalette,localPhase} from '../../src/model/daylight.ts';

test('Daylight uses four local phases and stays consistent across midnight',()=>{
  const dawn=daylightPalette(5),day=daylightPalette(8),dusk=daylightPalette(17),night=daylightPalette(20);
  assert.equal(new Set([dawn,day,dusk,night]).size,4);
  assert.equal(daylightPalette(7),dawn);
  assert.equal(daylightPalette(16),day);
  assert.equal(daylightPalette(19),dusk);
  for(const hour of [23,0,4])assert.equal(daylightPalette(hour),night);
});

test('wallpaper schedules reject unknown choices and preserve all four phases',()=>{
  const valid={dawn:'dune',day:'daylight',dusk:'tide',night:'ink'};
  assert.deepEqual(validateWallpaperSchedule(valid),valid);
  assert.equal(validateWallpaperSchedule({dawn:'unknown',day:'daylight',dusk:'tide',night:'ink'}),undefined);
  assert.equal(validateWallpaperSchedule({dawn:'dune',day:'silk'}),undefined);
  assert.equal(localPhase(20),'night');
});
