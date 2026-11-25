// SPDX-License-Identifier: AGPL-3.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clockMinute,quietHours,timeText} from '../../src/model/quiet-hours.ts';

test('accepts only distinct local times and round-trips an overnight schedule',()=>{
  assert.deepEqual(quietHours({start:clockMinute('22:00'),end:clockMinute('07:05')}),{start:1320,end:425});
  assert.equal(timeText(425),'07:05');
  assert.equal(clockMinute('00:00'),0);
  assert.equal(clockMinute('24:00'),undefined);
  assert.equal(clockMinute('07:71'),undefined);
  assert.equal(quietHours({start:5,end:5}),null);
  assert.equal(quietHours({start:'5',end:100}),null);
});
