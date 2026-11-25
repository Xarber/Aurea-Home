// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {filterViewingEntries,viewingSources} from '../../src/model/viewing-source.ts';

test('source options are sorted, de-duplicated by app identity, and omit missing labels',()=>{
  const entries=[
    {id:'stream-a',label:'Series'}, {id:'stream-b',label:'Browse'},
    {id:'stream-a',label:'Renamed'}, {id:'stream-c',label:'Series'}, {id:'unknown',label:''},
  ];
  const source=(item:typeof entries[number])=>item;
  assert.deepEqual(viewingSources(entries,source,'en').map(item=>item.id),['stream-b','stream-a','stream-c']);
  assert.deepEqual(filterViewingEntries(entries,source,'stream-c'),[entries[3]]);
  assert.equal(filterViewingEntries(entries,source),entries);
  assert.deepEqual(viewingSources([],source,'en'),[]);
});
