import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createZenithConnection} from '../runtime/zenith-connection.js';
function fixture(demo=false){
 const original={document:globalThis.document,window:globalThis.window,location:globalThis.location};
 let receive,poll,opens=0;const posts=[],changes=[],receipts=[];
 const popup={closed:false,focus(){},postMessage:(data,origin)=>posts.push({data,origin})};
 globalThis.document={querySelector:()=>({content:'http://127.0.0.1:4338'})};globalThis.location={hostname:'127.0.0.1'};
 globalThis.window={open(){opens++;return popup;},setInterval(fn){poll=fn;return 0;},addEventListener(event,fn){receive=fn;}};
 const bridge=createZenithConnection({demo,changed:(state,note)=>changes.push({state,note}),sent:receipt=>receipts.push(receipt)});
 bridge.open();if(poll)poll();const nonce=posts[0]?.data.nonce;
 const status={type:'zenith.matrix.connection.v1',kind:'status',nonce,authenticated:true,ready:true,userId:'@test:example.invalid',recipient:'@anima:example.invalid',roomId:'!room:example.invalid'};
 return {bridge,popup,posts,changes,receipts,nonce,opens:()=>opens,status,
  event(data=status,origin='http://127.0.0.1:4338',source=popup){receive({data,origin,source});},
  restore(){Object.assign(globalThis,original);}};
}
test('only the pinned origin, exact popup and connection nonce can enable delivery',()=>{
 const f=fixture();try{
  f.event(f.status,'https://evil.invalid');f.event(f.status,undefined,{});f.event({...f.status,nonce:crypto.randomUUID()});assert.equal(f.bridge.ready(),false);
  f.event({...f.status,authenticated:false});assert.equal(f.bridge.ready(),false);
  f.event(f.status);assert.equal(f.bridge.ready(),true);
 }finally{f.restore();}
});
test('connecting shares no brief; review needs a live connection and receipts must match the reviewed ID',()=>{
 const f=fixture();try{
  assert.equal(f.posts[0].data.kind,'hello');assert.equal('brief' in f.posts[0].data,false);
  f.event();const id=crypto.randomUUID();f.bridge.review({id},[]);assert.equal(f.posts.at(-1).data.kind,'review');assert.throws(()=>f.bridge.review({id},[]),/already/);
  const receipt={...f.status,kind:'sent',briefId:'wrong',transport:'matrix',messageId:'$event',recipientId:'@anima:example.invalid'};f.event(receipt);assert.equal(f.receipts.length,0);
  f.event({...receipt,briefId:id,transport:'unsupported'});assert.equal(f.receipts.length,0);
  f.event({...receipt,briefId:id});assert.equal(f.receipts.length,1);
  f.popup.closed=true;assert.equal(f.bridge.ready(),false);
 }finally{f.restore();}
});
test('walkthrough cannot open live Matrix authentication',()=>{
 const f=fixture(true);try{assert.equal(f.opens(),0);assert.equal(f.bridge.ready(),false);}finally{f.restore();}
});

test('send intent waits for Matrix authentication without requiring a wallet or membership',()=>{
 const f=fixture();try{const id=crypto.randomUUID();f.bridge.review({id},[]);assert.equal(f.posts.some(p=>p.data.kind==='review'),false);f.event();assert.equal(f.posts.at(-1).data.kind,'review');assert.equal(f.posts.at(-1).data.brief.id,id);}finally{f.restore();}
});
