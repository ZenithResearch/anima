import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../workspace/domain.mjs';
import {prepareBriefDelivery} from '../runtime/brief-delivery.js';
import {saveWorkspaceBrief,saveFoundationDirection} from '../runtime/workspace-marketing-model.js';
function state(){return saveWorkspaceBrief({...emptyState(),brand:{name:'Example',email:'must-not-transfer@example.invalid'},assets:[{id:'shared',kind:'link',name:'Board',url:'https://www.pinterest.com/example/board/'},{id:'unselected',kind:'file',name:'private-not-selected.txt'}],world:{invitationDrafts:[{email:'must-not-transfer@example.invalid'}],arbitrarySecret:'not-part-of-the-brief'}},{version:1,promptSet:'feeling-v2',answers:{feeling:'Quiet',people:'Makers',world:'An open world',signature:'A shared studio'},assetIds:['shared'],outputs:[]});}
test('shared snapshot contains selected material only, with no contact info, teammates or workflow',async()=>{
 const s=state(),before=structuredClone(s),{brief,files}=await prepareBriefDelivery(s,async()=>undefined);
 assert.deepEqual(files,[]);assert.equal(brief.references.length,1);assert.deepEqual(brief.brand,{name:'Example'});assert.equal(JSON.stringify(brief).includes('must-not-transfer'),false);assert.equal(JSON.stringify(brief).includes('arbitrarySecret'),false);assert.deepEqual(s,before);
});
test('all foundation references join the same snapshot without duplicate originals',async()=>{
 let s=state();s.assets.push({id:'original',kind:'file',name:'original.png'});
 s=saveFoundationDirection(s,'logo',{notes:'Open shapes',assetIds:['shared','original']});s=saveFoundationDirection(s,'type',{notes:'Quiet letterforms',assetIds:['original']});
 let reads=0;const packet=await prepareBriefDelivery(s,async()=>{reads++;return new Blob(['file bytes'],{type:'image/png'});});
 assert.equal(reads,1);assert.equal(packet.brief.references.length,2);assert.equal(packet.files.length,1);assert.equal(packet.brief.foundations.length,2);
});
test('missing originals and incomplete briefs are never quietly sent as metadata',async()=>{
 const s=state();s.assets.push({id:'missing',kind:'file',name:'lost.png'});s.world.packageBrief.assetIds.push('missing');
 await assert.rejects(prepareBriefDelivery(s,async()=>undefined),/Reattach/);
 await assert.rejects(prepareBriefDelivery(emptyState(),async()=>undefined),/Complete/);
});

test('new questions and all seven people survive a selected-only v2 snapshot; evidence remains optional',async()=>{
 const {exampleBrand}=await import('../runtime/example-brand.js');const {validateBrief}=await import('../workspace/brief-delivery.mjs');
 const draft=exampleBrand();draft.peopleEntries.push('Sixth type','Seventh type');draft.answers.people=draft.peopleEntries.map((s,i)=>`${i+1}. ${s}`).join('\n\n');delete draft.answers.signature;delete draft.answers.references;delete draft.answers.body;
 const s=saveWorkspaceBrief(emptyState(),{...draft,assetIds:[],outputs:[]});const packet=await prepareBriefDelivery(s,async()=>undefined);
 assert.equal(packet.brief.schema,'anima.brand-brief.v2');assert.equal(packet.brief.peopleEntries.length,7);assert.deepEqual(packet.brief.references,[]);assert.equal(packet.brief.answers.emotion,draft.answers.emotion);assert.equal(packet.brief.answers.brand,draft.answers.brand);assert.equal(packet.brief.answers.body,undefined);
 validateBrief(packet.brief);const changed=structuredClone(packet.brief);changed.peopleEntries[0]='changed';assert.throws(()=>validateBrief(changed),/match/);
 const loaded=(await import('../runtime/workspace-marketing-model.js')).workspaceBrief(s);assert.deepEqual(loaded.peopleEntries,draft.peopleEntries);
});
