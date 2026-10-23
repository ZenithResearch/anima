import test from 'node:test';
import assert from 'node:assert/strict';
import {lifePassage,MINOR} from '../runtime/life-passage.js';
test('passages borrow adjoining water without enlarging or mutating layout boxes',()=>{
 const box={left:24,top:900,width:342,height:580};
 const result=lifePassage(box,64,240);
 assert.equal(result.left,24);assert.equal(result.width,342);
 assert.equal(result.top,900-64*MINOR);
 assert.equal(result.top+result.height,1480+240*MINOR);
 assert.deepEqual(box,{left:24,top:900,width:342,height:580});
});
test('DOMRect-style prototype accessors retain finite lateral coordinates',()=>{
 const rect=Object.create({left:76,top:1400,width:1126,height:430});
 const result=lifePassage(rect,48,200);
 for(const coordinate of Object.values(result))assert.ok(Number.isFinite(coordinate));
 assert.equal(result.width,1126);assert.equal(result.left,76);
 assert.deepEqual(lifePassage(rect,-10,-40),{left:76,top:1400,width:1126,height:430});
});
