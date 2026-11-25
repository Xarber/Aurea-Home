// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {discoveryHistory,exactDiscoveryTitle,rankRelatedTitles,type DiscoveryTitle} from '../../src/model/discovery-history.ts';

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

const title=(id:number,title:string,kind:DiscoveryTitle['kind']='movie'):DiscoveryTitle=>({id,title,kind,year:''});

test('suggestions require an unambiguous normalized exact seed',()=>{
  assert.deepEqual(exactDiscoveryTitle([title(1,'Dune'),title(2,'Dune: Part Two')],'ＤＵＮＥ '),title(1,'Dune'));
  assert.equal(exactDiscoveryTitle([title(1,'Dune'),title(2,'Dune','tv')],'Dune'),undefined);
  assert.equal(exactDiscoveryTitle([title(1,'Dune: Part Two')],'Dune'),undefined);
});

test('recommendations rank repeated related titles and exclude already used seeds',()=>{
  const first=title(1,'Arrival'),second=title(2,'Dune');
  const one=title(3,'Contact'),two=title(4,'Interstellar'),three=title(5,'Alien');
  assert.deepEqual(rankRelatedTitles([first,second],[[two,one,first],[one,three,one]]),[one,two,three]);
});
