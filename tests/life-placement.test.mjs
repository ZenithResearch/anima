import test from 'node:test';
import assert from 'node:assert/strict';
import {placeLife} from '../runtime/life-placement.js';
const intersects=(a,b,gap=14)=>a.left<b.left+b.width+gap&&a.left+a.width>b.left-gap&&a.top<b.top+b.height+gap&&a.top+a.height>b.top-gap;
test('the full swimming envelope clears two hero actions across layout shifts',()=>{
 for(const width of [272,310,342,500,650,789,950,1200,1600])for(const height of [300,550,780]){
  const region={left:24,top:80,width,height};
  const actions=[{left:24,top:80+height-90,width:width*.46,height:50},{left:24+width*.5,top:80+height-90,width:width*.5,height:50}];
  const p=placeLife(region,{x:24+width*.77,y:80+height*.65,size:Math.min(660,width*.9)},{x:.58,y:.58},actions);
  assert.ok(p.size>0);for(const a of actions)assert.equal(intersects(p.box,a),false);
  assert.ok(p.box.left>=region.left-1e-8&&p.box.top>=region.top-1e-8);
  assert.ok(p.box.left+p.box.width<=region.left+region.width+1e-8);
  assert.ok(p.box.top+p.box.height<=region.top+region.height+1e-8);
 }
});
test('occupied water omits decorative life rather than covering an action',()=>{
 const region={left:0,top:0,width:100,height:100};
 assert.equal(placeLife(region,{x:50,y:50,size:100},{x:.6,y:.6},[region]).size,0);
});
test('safe art direction is preserved and a jellyfish includes its trailing tentacles',()=>{
 const region={left:0,top:0,width:900,height:700};
 const desired={x:700,y:310,size:300};
 const actions=[{left:0,top:560,width:360,height:60}];
 const p=placeLife(region,desired,{x:.55,y:.90},actions);
 assert.equal(p.x,700);assert.equal(p.y,310);assert.equal(p.size,300);
 assert.equal(intersects(p.box,actions[0]),false);
});
