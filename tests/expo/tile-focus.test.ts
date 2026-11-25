// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {tileFocusTransform} from '../../src/model/tile-focus.ts';

test('optional focus sway keeps the existing scale and resets on press or blur',()=>{
  assert.deepEqual(tileFocusTransform(true,false,false,false),[{scale:1.045}]);
  assert.deepEqual(tileFocusTransform(true,false,false,true),[{perspective:800},{rotateX:'2deg'},{scale:1.045}]);
  assert.deepEqual(tileFocusTransform(true,true,false,true),[{perspective:800},{rotateX:'0deg'},{scale:.97}]);
  assert.deepEqual(tileFocusTransform(false,false,false,true),[{perspective:800},{rotateX:'0deg'},{scale:1}]);
  assert.deepEqual(tileFocusTransform(true,false,true,true),[{scale:1}]);
});
