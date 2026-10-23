import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {OPPORTUNITY_OPTIONS,OPPORTUNITY_MASK,selectedOpportunities} from '../water/talent-opportunities.mjs';
import {opportunityMask,opportunitiesValid} from '../runtime/opportunities.js';
import {introductionEmail} from '../water/landing-model.mjs';
const {instance}=await WebAssembly.instantiate(await readFile(new URL('../anima_core.wasm',import.meta.url)),{});
const core=instance.exports,older={...core};delete older.opportunity_mask_v3;delete older.opportunities_valid_v2;
const engines=[{mode:'wasm',exports:core},{mode:'wasm',exports:older},{mode:'fallback',exports:null}];
test('the built roster exposes every canonical type through native named checkboxes',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const roster=html.match(/<form id="talent-introduction"[\s\S]*?<\/form>/)[0];
 for(const option of OPPORTUNITY_OPTIONS){
  assert.ok(roster.includes(`name="${option.key}" type="checkbox" value="yes"`),option.key);
 }
 assert.equal((roster.match(/class="opportunity-group"/g)||[]).length,4);
 assert.ok(!roster.includes('{{talentOpportunities}}'));
});
test('each canonical interest is selectable alone, with the same bit and validation across core versions',()=>{
 assert.equal(OPPORTUNITY_OPTIONS.length,24);
 assert.equal(new Set(OPPORTUNITY_OPTIONS.map(o=>o.key)).size,24);
 assert.equal(new Set(OPPORTUNITY_OPTIONS.map(o=>o.bit)).size,24);
 for(const option of OPPORTUNITY_OPTIONS)for(const engine of engines){
  const has=key=>option.key===key;
  const mask=opportunityMask(engine,has('live'),has('digital'),has('atmosphere'),has('promotion'),option.bit>=4?1<<option.bit:0);
  assert.equal(mask,1<<option.bit,option.key);assert.ok(opportunitiesValid(engine,mask),option.key);
 }
 for(const engine of engines){assert.equal(opportunitiesValid(engine,0),false);assert.equal(opportunitiesValid(engine,0x80000000),false);}
});
test('all work types survive the prepared email; unknown fields do not become interests',()=>{
 const raw=Object.fromEntries(OPPORTUNITY_OPTIONS.map(o=>[o.key,'yes']));raw.unknown='yes';
 assert.equal(selectedOpportunities(raw).length,24);
 const body=new URL(introductionEmail('talent',raw)).searchParams.get('body');
 for(const option of OPPORTUNITY_OPTIONS)assert.ok(body.includes(option.label),option.key);
 assert.ok(!body.includes('unknown'));
 assert.equal(core.opportunity_mask_v3(1,1,1,1,0xffffffff),OPPORTUNITY_MASK);
});
test('singing or voice alone does not infer live, digital, atmosphere or promotion',()=>{
 for(const key of ['singing','voiceover','narration']){
  const raw={[key]:'yes',representation:'self'},body=new URL(introductionEmail('talent',raw)).searchParams.get('body');
  assert.equal(selectedOpportunities(raw).length,1);
  assert.ok(!body.includes('Live events / appearances —'));assert.ok(!body.includes('Digital / social —'));
  assert.ok(body.includes('Atmosphere modelling: Not opted in'));assert.ok(body.includes('Promotional work: Not opted in'));
 }
});
