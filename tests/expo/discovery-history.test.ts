// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {discoveryHistory} from '../../src/model/discovery-history.ts';

test('keeps the most recent copy of a title and excludes general YouTube imports',()=>{
  assert.deepEqual(discoveryHistory(
    [{title:'Arrival',observedAt:7}, {title:'Dune',observedAt:9}, {title:'',observedAt:30}, null],
    [{service:'Netflix',title:'  ARRIVAL ',watched:10},{service:'YouTube',title:'Review',watched:12}],
  ),['ARRIVAL','Dune']);
});

test('bounds recent suggestions and ignores corrupt stores',()=>{
  const records=Array.from({length:12},(_,observedAt)=>({title:'Title '+observedAt,observedAt}));
  assert.deepEqual(discoveryHistory(records,undefined),records.slice(4).reverse().map(entry=>entry.title));
  assert.deepEqual(discoveryHistory(undefined,[{service:'Netflix',title:'A'.repeat(121),watched:55}]),[]);
});
