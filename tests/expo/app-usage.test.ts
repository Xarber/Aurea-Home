// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import test from 'node:test';
import {appUsage} from '../../src/model/app-usage.ts';

test('TV usage distinguishes unavailable, ungranted, and empty reports',()=>{
 assert.deepEqual(appUsage({}),{status:'unavailable'});
 assert.deepEqual(appUsage({status:'permission',apps:[{label:'Private',minutes:40}]}),{status:'permission'});
 assert.deepEqual(appUsage({status:'ready',apps:[]}),{status:'ready',apps:[]});
});

test('TV usage accepts bounded reported minutes and sends no package identity to the view',()=>{
 assert.deepEqual(appUsage({status:'ready',apps:[
  {label:'Movie app',minutes:24,packageId:'never-displayed'},
  {label:'Negative',minutes:-1},{label:'Invalid',minutes:1.2},{label:'Number string',minutes:'5'},
  {label:'Excess',minutes:1561},{label:'',minutes:1},null,
 ]}),{status:'ready',apps:[{label:'Movie app',minutes:24}]});
 assert.equal((appUsage({status:'ready',apps:Array.from({length:13},()=>({label:'TV',minutes:1}))}) as
  {apps:unknown[]}).apps.length,12);
});
