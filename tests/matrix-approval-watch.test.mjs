import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {observeMatrixApproval} from '../runtime/matrix-approval-watch.js';
const example=JSON.parse(await readFile(new URL('../provider-contract/matrix-companion-v1.fixture.json',import.meta.url),'utf8'));
const prepared={approval_id:'approval-fixture',expires_at:5000};
const status=(state,result=null)=>({schema:'castalia.matrix-approval-status.v1',state,result});
const options=(extra={})=>({signal:new AbortController().signal,isCurrent:()=>true,expected:'connection',now:()=>1000,pause:async()=>{},...extra});

test('observer accepts only authoritative approval state and preserves all denied/expired results',async()=>{
 for(const state of ['denied','expired']){const result=await observeMatrixApproval({getApprovalStatus:async()=>status(state)},prepared,options());assert.equal(result.kind,'wallet-result');assert.equal(result.approval.state,state);}
 let calls=0;const result=await observeMatrixApproval({getApprovalStatus:async q=>{assert.deepEqual(q,{schema:'castalia.matrix-approval-status-request.v1',approval_id:prepared.approval_id});return ++calls===1?status('pending'):status('approved',example.connect.result);}},prepared,options());assert.equal(calls,2);assert.equal(result.approval.connection.user_id,example.connect.result.user_id);
});

test('closed observation ignores late approval and never invokes Wallet cancellation or denial',async()=>{
 const control=new AbortController();let resolve;const client={getApprovalStatus:()=>new Promise(r=>{resolve=r;}),cancelApproval:()=>assert.fail('observation cannot cancel Wallet authority'),deny:()=>assert.fail('no app denial authority')};
 const waiting=observeMatrixApproval(client,prepared,options({signal:control.signal}));await Promise.resolve();control.abort();const result=await waiting;assert.deepEqual(result,{kind:'observation-ended',reason:'closed'});resolve(status('approved',example.connect.result));await Promise.resolve();assert.deepEqual(result,{kind:'observation-ended',reason:'closed'});
});

test('lock/account/context change prevents disclosure of an otherwise approved result',async()=>{
 let current=true;const result=await observeMatrixApproval({getApprovalStatus:async()=>{current=false;return status('approved',example.connect.result);}},prepared,options({isCurrent:()=>current}));assert.deepEqual(result,{kind:'observation-ended',reason:'context-changed'});
 let calls=0;await observeMatrixApproval({getApprovalStatus:async()=>{calls++;return status('pending');}},prepared,options({isCurrent:()=>false}));assert.equal(calls,0);
});

test('local deadline is not falsely reported as Wallet expiry and a failed read leaks no error text',async()=>{
 let time=1000;const result=await observeMatrixApproval({getApprovalStatus:async()=>status('pending')},prepared,options({now:()=>time,pause:async ms=>{time+=ms;}}));assert.deepEqual(result,{kind:'observation-ended',reason:'deadline'});
 const unavailable=await observeMatrixApproval({getApprovalStatus:()=>{throw Error('private-token-must-not-escape');}},prepared,options());assert.deepEqual(unavailable,{kind:'observation-ended',reason:'unavailable'});assert.doesNotMatch(JSON.stringify(unavailable),/private-token/);
});

test('wrong operation result, malformed public fields and invalid request identity fail closed',async()=>{
 assert.deepEqual(await observeMatrixApproval({getApprovalStatus:async()=>status('approved',example.send.result)},prepared,options()),{kind:'observation-ended',reason:'unavailable'});
 assert.deepEqual(await observeMatrixApproval({getApprovalStatus:async()=>status('approved',{...example.connect.result,access_token:'leak'})},prepared,options()),{kind:'observation-ended',reason:'unavailable'});
 assert.deepEqual(await observeMatrixApproval({getApprovalStatus:async()=>assert.fail('invalid identity must not read')},{...prepared,approval_id:'bad\nhandle'},options()),{kind:'observation-ended',reason:'unavailable'});
});

test('send observation preserves unknown/failed delivery without service acceptance or fallback',async()=>{
 for(const state of ['sent','unknown','failed']){const result=await observeMatrixApproval({getApprovalStatus:async()=>status('approved',{...example.send.result,state,event_id:state==='sent'?example.send.result.event_id:null})},prepared,options({expected:'delivery'}));assert.equal(result.approval.delivery.state,state);assert.equal('service_request' in result,false);assert.equal('queue_fallback' in result,false);}
});
