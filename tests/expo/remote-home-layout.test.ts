// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseHomeLayout} from '../../src/remote/homeLayout.ts';

test('paired remote editors require six distinct items, the library slot and a revision',()=>{
  const dock=['a','b','c','d','e','all'].map(id=>({id,name:id}));
  const value={dock,wallpaper:'classic',revision:'a'.repeat(43)};
  assert.deepEqual(parseHomeLayout(value),value);
  assert.throws(()=>parseHomeLayout({...value,revision:'wrong'}));
  assert.throws(()=>parseHomeLayout({...value,dock:[dock[5],...dock.slice(0,5)]}));
  assert.throws(()=>parseHomeLayout({...value,dock:[dock[0],...dock.slice(0,5)]}));
});
