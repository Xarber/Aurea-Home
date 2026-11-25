// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cleanQuickActions} from '../../src/model/quick-actions.ts';

test('a profile can spotlight three portable settings actions in selection order',()=>{
  assert.deepEqual(cleanQuickActions(['unknown','remote','remote','wallpapers','sound','watchNext','__proto__']),
    ['remote','wallpapers','sound']);
  assert.deepEqual(cleanQuickActions(undefined),[]);
});
