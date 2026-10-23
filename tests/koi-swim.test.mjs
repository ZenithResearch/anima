import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {KoiSwim} from '../runtime/koi-model.js';
import {connectKoiSwimmer} from '../runtime/koi-swimmer.js';
const {instance}=await WebAssembly.instantiate(await readFile(new URL('../anima_core.wasm',import.meta.url)),{});
const step=instance.exports.koi_step;
test('WASM koi remains finite and contained over ten minutes, including edge-seeking goals',()=>{
 const fish=new KoiSwim(step,813);
 for(let i=0;i<36000;i++){
  fish.advance(1/60,Math.sin(i*.002),Math.cos(i*.002),i%180<30?1:0);
  const [x,y,vx,vy]=fish.state;
  assert.ok(fish.state.every(Number.isFinite));assert.ok(Math.abs(x)<=1&&Math.abs(y)<=1);
  assert.ok(Math.hypot(vx,vy)<=.750001);
 }
});
test('fixed simulation steps preserve speed across refresh rates and pause is exact',()=>{
 const slow=new KoiSwim(step,12),fast=new KoiSwim(step,12);
 for(let i=0;i<600;i++)slow.advance(1/30,10,10,0);
 for(let i=0;i<2400;i++)fast.advance(1/120,10,10,0);
 for(let i=0;i<4;i++)assert.ok(Math.abs(slow.state[i]-fast.state[i])<1e-8);
 const before=JSON.stringify(slow);for(let i=0;i<600;i++)slow.advance(0,0,0,1);
 assert.equal(JSON.stringify(slow),before);
});
test('nearby disturbances alter steering while distant ones leave the path unchanged',()=>{
 const quiet=new KoiSwim(step,99),near=new KoiSwim(step,99),far=new KoiSwim(step,99);
 // A heavy swimmer responds over a few seconds rather than snapping away.
 for(let i=0;i<180;i++){quiet.advance(1/60,10,10,0);far.advance(1/60,10,10,1);near.advance(1/60,.1,.1,1);}
 assert.deepEqual(quiet.state,far.state);assert.ok(Math.hypot(quiet.state[0]-near.state[0],quiet.state[1]-near.state[1])>.02);
});
test('an outward-swimming koi turns inward without stalling at its boundary',()=>{
 const fish=new KoiSwim(step,42);fish.state=[.82,0,.45,.12];fish.goal=[.95,.1];
 for(let i=0;i<600;i++)fish.advance(1/60,10,10,0);
 assert.ok(fish.state[0]<.82);assert.ok(fish.state[2]<0);
 assert.ok(Math.hypot(fish.state[2],fish.state[3])>.06);
});
test('session seeds vary paths; older cached cores keep the original shader without throwing',()=>{
 const a=new KoiSwim(step,1),b=new KoiSwim(step,6789);
 for(let i=0;i<1200;i++){a.advance(1/60,10,10,0);b.advance(1/60,10,10,0);}
 assert.notDeepEqual(a.state,b.state);
 const original=globalThis.document;
 try {globalThis.document={querySelector:()=>({})};assert.doesNotThrow(()=>connectKoiSwimmer({ready:true},{mode:'wasm',exports:{engine_version:()=>1}}).destroy());}
 finally {globalThis.document=original;}
});

test('rearward destinations produce a traveling arc rather than a centre pivot',()=>{
 let state=[0,0,.12,0],distance=0,maxYaw=0,minSpeed=1;
 for(let i=0;i<1200;i++){
  const next=[0,1,2,3].map(c=>step(c,...state,-.8,0,10,10,0,.12,1/120));
  const cross=state[2]*next[3]-state[3]*next[2],dot=state[2]*next[2]+state[3]*next[3];
  maxYaw=Math.max(maxYaw,Math.abs(Math.atan2(cross,dot))*120);
  minSpeed=Math.min(minSpeed,Math.hypot(next[2],next[3]));
  distance+=Math.hypot(next[0]-state[0],next[1]-state[1]);
  if(i===479){assert.ok(next[2]>0,'still traveling through the broad first half of the turn');assert.ok(Math.hypot(next[0],next[1])>.30);}
  state=next;
 }
 assert.ok(maxYaw<=.360001);assert.ok(minSpeed>.034);assert.ok(distance>.7);
 assert.ok(state[2]<0,'eventually faces back through a continuous arc');
});
test('long sessions turn before the guard instead of sliding along a clamped wall',()=>{
 for(const seed of [1,42,813,99,6789]){
  const fish=new KoiSwim(step,seed);
  for(let i=0;i<36000;i++){
   const previous=fish.state;
   fish.advance(1/60,Math.sin(i*.002),Math.cos(i*.002),i%180<30?1:0);
   assert.ok(Math.abs(fish.state[0])<.999&&Math.abs(fish.state[1])<.999);
   const yaw=Math.abs(Math.atan2(previous[2]*fish.state[3]-previous[3]*fish.state[2],previous[2]*fish.state[2]+previous[3]*fish.state[3]));
   assert.ok(yaw<=.36/60+1e-7);
  }
 }
});

test('wide and tall sections retain a slow screen-space turn and v1 callers remain compatible',()=>{
 const args=[0,0,.12,0,-.8,0,10,10,0,.12,1/120];
 for(let c=0;c<4;c++)assert.equal(step(c,...args),instance.exports.koi_step_v2(c,...args,1));
 for(const aspect of [.25,.5,2,4]){
  const fish=new KoiSwim((...args)=>instance.exports.koi_step_v2(...args,aspect),813);
  for(let i=0;i<36000;i++){
   const old=fish.state;
   fish.advance(1/60,Math.sin(i*.002),Math.cos(i*.002),i%180<30?1:0);
   const next=fish.state;
   const cross=aspect*(old[2]*next[3]-old[3]*next[2]);
   const dot=aspect*aspect*old[2]*next[2]+old[3]*next[3];
   assert.ok(Math.abs(Math.atan2(cross,dot))*60<.365,'no compressed-axis pivot');
   assert.ok(Math.abs(next[0])<.999&&Math.abs(next[1])<.999);
  }
 }
});
