// SPDX-License-Identifier: AGPL-3.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findRoku,parseRokuInfo,rokuAddress,sendRokuKey} from '../../src/remote/roku/ecp.ts';

const address='http://192.168.1.10:8060';
const id='f6b245c6-cbbe-4a6d-84c5-184768c201ce';
const xml=(udn=id)=>'<?xml version="1.0"?><device-info><udn>'+udn+'</udn>'+
  '<user-device-name>Office &amp; TV</user-device-name><is-tv>true</is-tv></device-info>';
const signal=new AbortController().signal;

test('Roku control accepts only a literal private endpoint fixed to port 8060',()=>{
  assert.equal(rokuAddress(' 192.168.1.10 '),address);
  assert.equal(rokuAddress(address+'/'),address);
  for(const unsafe of ['https://192.168.1.10','192.168.1.10:80','192.168.001.10','127.0.0.1',
    '192.168.1.10/home','8.8.8.8','10.257.0.1','172.32.1.3','10.0.3.4?query','http://user@10.0.3.4']){
    assert.throws(()=>rokuAddress(unsafe));
  }
});

test('uses device capabilities and refuses unsafe or oversize XML',()=>{
  assert.deepEqual(parseRokuInfo(xml(),address),{address,id,name:'Office & TV',volume:true,power:true});
  assert.throws(()=>parseRokuInfo('<!DOCTYPE root>'+xml(),address),/invalid_response/);
  assert.throws(()=>parseRokuInfo(xml().repeat(300),address),/invalid_response/);
});

test('a keypress rechecks the expected television and uses the documented PowerOff key',async()=>{
  const calls:Array<[string,string|undefined,RequestRedirect|undefined,RequestCredentials|undefined]>=[];
  const request=async(url:string,options:RequestInit)=>{
    calls.push([url,options.method,options.redirect,options.credentials]);
    return options.method==='POST'?new Response(null):new Response(xml());
  };
  const target=await findRoku(address,request,signal);
  calls.length=0;
  await sendRokuKey(target,'power',request,signal);
  assert.deepEqual(calls,[[address+'/query/device-info','GET','error','omit'],
    [address+'/keypress/PowerOff','POST','error','omit']]);
  await assert.rejects(sendRokuKey({...target,id:'different-session-00'},'home',request,signal),/device_changed/);
  assert.equal(calls.length,3);
});

test('reports a restricted remote without repeating the button',async()=>{
  const attempts:string[]=[];
  const request=async(url:string,options:RequestInit)=>{
    if(options.method==='GET')return new Response(xml());
    attempts.push(url);
    return new Response(null,{status:403});
  };
  const target=parseRokuInfo(xml(),address);
  await assert.rejects(sendRokuKey(target,'ok',request,signal),/roku_controls_disabled/);
  assert.deepEqual(attempts,[address+'/keypress/Select']);
  await assert.rejects(sendRokuKey(target,'voice',request,signal),/unsupported/);
  assert.equal(attempts.length,1);
});
