import test from 'node:test';
import assert from 'node:assert/strict';
import {koiClearing} from '../runtime/koi-clearing.js';

test('wide screens use the open left column below the heading, away from prose',()=>{
 const section={left:86,top:100,width:1268,height:455};
 const heading={left:86,top:190,width:750,height:185};
 const prose={left:890,top:190,width:381,height:310};
 const open=koiClearing(section,heading,prose,90);
 assert.equal(open.left,heading.left);assert.equal(open.width,heading.width);
 assert.ok(open.top>heading.top+heading.height);
 assert.ok(open.left+open.width<prose.left);
 assert.equal(open.top+open.height,600);assert.equal(open.size,340);
});
test('stacked layouts use the existing section seam, shrinking the animal without inserting space',()=>{
 for(const width of [272,342,510,702]){
  const section={left:24,top:100,width,height:550};
  const heading={left:24,top:170,width,height:120};
  const prose={left:24,top:314,width,height:294};
  const open=koiClearing(section,heading,prose,70);
  assert.equal(open.top,596);assert.equal(open.top+open.height,685);
  assert.ok(open.size<=200);assert.ok(open.size<=width*.58);
  assert.equal(section.height,550);
 }
});
