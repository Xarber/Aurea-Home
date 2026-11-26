// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import test from 'node:test';
import {watchNextPrograms,watchNextProgress} from '../../src/model/watch-next.ts';

test('the home shelf only presents distinct programs from available Watch Next records',()=>{
 const entry={id:'1',title:'A show',source:'Video provider',positionMs:75,durationMs:100};
 assert.equal(watchNextPrograms({available:false,entries:[entry]}),undefined);
 assert.deepEqual(watchNextPrograms({available:true,entries:[null,{...entry,title:' '},entry,entry]}),[entry]);
 assert.equal(watchNextProgress(entry),75);
 assert.equal(watchNextProgress({...entry,positionMs:150}),100);
 assert.equal(watchNextProgress({...entry,durationMs:0}),undefined);
 assert.equal(watchNextProgress({...entry,positionMs:-1}),undefined);
});
