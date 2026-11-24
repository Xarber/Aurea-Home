// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {daylightPalette} from '../../src/model/daylight.ts';

test('Daylight uses four local phases and stays consistent across midnight',()=>{
  const dawn=daylightPalette(5),day=daylightPalette(8),dusk=daylightPalette(17),night=daylightPalette(20);
  assert.equal(new Set([dawn,day,dusk,night]).size,4);
  assert.equal(daylightPalette(7),dawn);
  assert.equal(daylightPalette(16),day);
  assert.equal(daylightPalette(19),dusk);
  for(const hour of [23,0,4])assert.equal(daylightPalette(hour),night);
});
