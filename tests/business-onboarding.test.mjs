import {test} from 'node:test';
import assert from 'node:assert/strict';
import {INTRODUCTION_KEY,INTRODUCTION_TTL,introductionRecord,stageIntroduction,consumeIntroduction} from '../workspace/introduction.mjs';
import {emptyState,getBrandQuestionnaire,saveBrandQuestionnaire,prepareBrandRoundtableHandoff,brandHandoffIsCurrent,brandQuestionnaireProgress,reconcileBrandHandoff} from '../workspace/domain.mjs';
const id='95fed9ca-2de2-44d0-a70c-5cbb9677f591';
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('introduction is consumed once and private contact does not become a brand field',()=>{
 const storage=memory(),record=introductionRecord({name:'  Review Person  ',email:'review@example.com',organization:'Review Studio'},id,1000);
 stageIntroduction(storage,record);assert.equal(consumeIntroduction(storage,id,1100).name,'Review Person');
 assert.equal(storage.getItem(INTRODUCTION_KEY),null);assert.equal(consumeIntroduction(storage,id,1101),null);
 const state=emptyState();state.brand.name=record.organization;
 assert.equal(JSON.stringify(state).includes(record.email),false);assert.equal(JSON.stringify(state).includes(record.name),false);
});
test('expired, mismatched and future introduction packets are cleared',()=>{
 for(const [draft,now] of [[id,1000+INTRODUCTION_TTL+1],['95fed9ca-2de2-44d0-a70c-5cbb9677f592',1001],[id,999]]){
  const storage=memory();stageIntroduction(storage,introductionRecord({name:'A',email:'a@example.com',organization:'B'},id,1000));
  assert.equal(consumeIntroduction(storage,draft,now),null);assert.equal(storage.getItem(INTRODUCTION_KEY),null);
 }
});
test('invalid introductions cannot stage a successful workspace transition',()=>{
 assert.throws(()=>introductionRecord({name:' ',email:'a@example.com',organization:'B'},id));
 assert.throws(()=>introductionRecord({name:'A',email:'invalid',organization:'B'},id));
 assert.throws(()=>introductionRecord({name:'A',email:'a@example.com',organization:'B'},'../../other'));
});
test('partial brand discovery remains useful; evidence preserves subject and origin',()=>{
 let state=emptyState();state.brand.name='Review Brand';
 state=saveBrandQuestionnaire(state,{answers:{feltPlace:'A quiet theatre after rehearsal.'},origins:{feltPlace:'lived'}});
 assert.deepEqual(brandQuestionnaireProgress(getBrandQuestionnaire(state)).answered,1);
 state=prepareBrandRoundtableHandoff(state);const packet=state.world.brandRoundtableHandoff;
 assert.equal(packet.evidence.length,1);assert.equal(packet.evidence[0].basis,'lived');assert.equal(packet.evidence[0].subject,'founder-or-steward');
 assert.equal(packet.openThreads.length,9);assert.deepEqual(packet.interpretations,[]);
 assert.equal(brandHandoffIsCurrent(packet,getBrandQuestionnaire(state)),true);
 const changed=saveBrandQuestionnaire(state,{answers:{feltPlace:'A different room.'}});
 assert.equal(changed.world.brandRoundtableHandoff.status,'needs-update');
 assert.equal(brandHandoffIsCurrent(changed.world.brandRoundtableHandoff,getBrandQuestionnaire(changed)),false);
});
test('file-only handoff includes selected references and never original file bodies',()=>{
 let state=emptyState();state.assets=[{id:'one',name:'Brand notes',kind:'file',type:'text/plain',size:12,body:'never serialize'}, {id:'two',name:'Private reference',kind:'link',url:'https://example.com'}];
 state=saveBrandQuestionnaire(state,{sourceIds:['one']});state=prepareBrandRoundtableHandoff(state);
 assert.equal(state.world.brandRoundtableHandoff.sources.length,1);
 assert.equal(state.world.brandRoundtableHandoff.sources[0].id,'one');
 assert.equal('body' in state.world.brandRoundtableHandoff.sources[0],false);
 assert.throws(()=>prepareBrandRoundtableHandoff(emptyState()));
});
test('older questionnaire answers stay original and future versions are not overwritten',()=>{
 const older={...emptyState(),world:{brandQuestionnaire:{version:1,answers:{purpose:'Keep this exact earlier answer.'},sourceIds:[]}}};
 const next=saveBrandQuestionnaire(older,{answers:{feltPlace:'A new fragment.'}});
 assert.equal(next.world.brandQuestionnaireHistory[0].answers.purpose,'Keep this exact earlier answer.');
 assert.equal(next.world.brandQuestionnaire.version,2);
 assert.throws(()=>saveBrandQuestionnaire({...emptyState(),world:{brandQuestionnaire:{version:3}}},{answers:{}}));
});
test('editing brand details outside discovery invalidates the previous handoff',()=>{
 let state=saveBrandQuestionnaire(emptyState(),{answers:{feltPlace:'A rehearsal room.'}});
 state=prepareBrandRoundtableHandoff(state);
 const next=reconcileBrandHandoff({...state,brand:{...state.brand,name:'Changed brand'}});
 assert.equal(next.world.brandRoundtableHandoff.status,'needs-update');
 assert.equal(next.world.brandRoundtableHandoff.existingBrandDetails.name,'');
 assert.equal(next.world.brandRoundtableHandoff.evidence[0].text,'A rehearsal room.');
});
test('unrelated material associations do not invalidate a current handoff',()=>{
 const state=prepareBrandRoundtableHandoff(saveBrandQuestionnaire(emptyState(),{answers:{feltPlace:'A rehearsal room.'}}));
 assert.equal(reconcileBrandHandoff(state),state);
 const next={...state,world:{...state.world,pieces:{voice:{assetIds:[]}}}};
 assert.equal(reconcileBrandHandoff(next),next);
});
