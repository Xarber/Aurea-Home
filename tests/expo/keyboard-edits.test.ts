// SPDX-License-Identifier: AGPL-3.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {keyboardEdits} from '../../src/remote/system/keyboardEdits.ts';
test('IME edits send only the inserted suffix and preserve deletion, paste and Unicode',()=>{
 assert.deepEqual(keyboardEdits('a','ab'),{remove:0,insert:'b'});
 assert.deepEqual(keyboardEdits('abc','ab'),{remove:1,insert:''});
 assert.deepEqual(keyboardEdits('hello world','hello TV'),{remove:5,insert:'TV'});
 assert.deepEqual(keyboardEdits('🎵a','🎵b'),{remove:1,insert:'b'});
 assert.deepEqual(keyboardEdits('','ciao TV'),{remove:0,insert:'ciao TV'});
});
