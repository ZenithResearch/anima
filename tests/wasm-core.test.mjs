import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {nextTab,configureInteractionCore} from '../water/landing-model.mjs';
import {screenToPond,configurePondCore} from '../water/pond-field.mjs';
import {keyCode,loadCore} from '../runtime/core.js';
import {opportunityMask} from '../runtime/opportunities.js';
const bytes=await readFile(new URL('../anima_core.wasm',import.meta.url));
const {instance}=await WebAssembly.instantiate(bytes,{}),core=instance.exports;
test('compiled WASM preserves keyboard navigation for every position in both flows',()=>{
 assert.equal(core.engine_version(),1);
 for(const count of [5,6])for(let i=0;i<count;i++)for(const key of ['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End','Enter']){
  assert.equal(core.next_tab(keyCode(key),i,count),nextTab(key,i,count)??-1);
 }
 assert.equal(core.next_tab(1,0,0),-1);
});
test('compiled WASM preserves all independent opportunity opt-ins',()=>{
 for(let l=0;l<2;l++)for(let d=0;d<2;d++)for(let a=0;a<2;a++){
  const mask=core.opportunity_mask(l,d,a);assert.equal(!!core.opportunities_valid(mask),!!(l||d));assert.equal((mask>>2)&1,a);
 }
});
test('compiled projection matches document-water coordinates at different scrolls and widths',()=>{
 for(const width of [320,390,848,1280])for(const scroll of [0,800,6000]){
  const rect={left:20,top:0,width,height:844},point=screenToPond(width*.6,300,rect,scroll);
  assert.equal(core.pond_x(width*.6,20,width),point[0]);assert.equal(core.pond_y(300,0,scroll,width),point[1]);
 }
 assert.equal(core.life_start(720,720),972.0000000000001);
});
test('typed loader accepts the compiled core and falls back on invalid bytes',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(bytes);assert.equal((await loadCore()).mode,'wasm');
  globalThis.fetch=async()=>new Response('invalid wasm');assert.deepEqual(await loadCore(),{mode:'fallback',exports:null});
  globalThis.fetch=async()=>new Response('',{status:404});assert.equal((await loadCore()).mode,'fallback');
 }finally{globalThis.fetch=original;}
});
test('legacy DOM controller bridges execute Rust exports without changing their callers',()=>{
 configureInteractionCore((key,index,count)=>{const n=core.next_tab(keyCode(key),index,count);return n<0?null:n;});
 configurePondCore({x:core.pond_x,y:core.pond_y});
 assert.equal(nextTab('ArrowRight',5,6),0);assert.equal(nextTab('Enter',0,6),null);
 assert.deepEqual(screenToPond(640,200,{left:0,top:0,width:1280},400),[0,3.75]);
});
test('Rust process reducer matches fallback across role/step transitions and invalid states',async()=>{
 const {fallbackProcess,decodeProcess}=await import('../runtime/process-model.js');
 const {roles}=await import('../runtime/process-copy.js');
 assert.equal(core.process_count(0),roles.client.steps.length);assert.equal(core.process_count(1),roles.creator.steps.length);
 const states=[...Array.from({length:6},(_,i)=>i),...Array.from({length:5},(_,i)=>(1<<16)|i),0xffffffff,(1<<16)|99];
 for(const state of states)for(const event of [0,1,2,3,4,5,99])for(const value of [0,1,4,5,6,99]){
  const actual=core.process_reduce(state,event,value),expected=fallbackProcess(state,event,value);
  assert.equal(actual,expected,`${state}/${event}/${value}`);
  const decoded=decodeProcess(actual);assert.ok(decoded.step<decoded.count);
 }
 let state=core.process_reduce(0,5,0);state=core.process_reduce(state,0,1);assert.deepEqual(decodeProcess(state),{role:'creator',step:0,count:5});
});

test('promotion extends the WASM mask without changing old preference bits',()=>{
 for(let l=0;l<2;l++)for(let d=0;d<2;d++)for(let a=0;a<2;a++)for(let p=0;p<2;p++){
  const mask=core.opportunity_mask_v2(l,d,a,p);
  assert.equal(mask&7,core.opportunity_mask(l,d,a));assert.equal((mask>>3)&1,p);
  assert.equal(!!core.opportunities_valid(mask),!!(l||d));
 }
});
test('promotion survives an older cached three-argument core and a failed WASM load',()=>{
 const older={...core};delete older.opportunity_mask_v2;
 for(const live of [false,true])for(const digital of [false,true])for(const atmosphere of [false,true])for(const promotion of [false,true]){
  const current=opportunityMask({mode:'wasm',exports:core},live,digital,atmosphere,promotion);
  assert.equal(opportunityMask({mode:'wasm',exports:older},live,digital,atmosphere,promotion),current);
  assert.equal(opportunityMask({mode:'fallback',exports:null},live,digital,atmosphere,promotion),current);
 }
});
