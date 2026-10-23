import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../workspace/domain.mjs';
import {workspaceBrief,saveWorkspaceBrief,briefMissing,foundationDirection,saveFoundationDirection} from '../runtime/workspace-marketing-model.js';
import {workspaceBriefView} from '../runtime/workspace-brief-view.js';
import {workspaceDashboard} from '../runtime/workspace-marketing-view.js';
import {foundationDirectionView} from '../runtime/foundation-direction-view.js';
const ready=()=>({...emptyState(),assets:[{id:'board',kind:'link',name:'Logo board',url:'https://www.pinterest.com/example/identity/'}],world:{custom:'retained',packageBrief:{version:1,promptSet:'feeling-v2',answers:{feeling:'Alive',people:'Artists',world:'Water',signature:'Making things together'},assetIds:['board'],outputs:['logo'],custom:'old brief metadata'}}});

test('global brief has no output picker; historical selections and metadata survive answer edits',()=>{
 const state=ready(),brief=workspaceBrief(state),before=JSON.stringify(state);
 const view=workspaceBriefView(brief,state.assets);
 assert.doesNotMatch(view,/name="packageOutput"|What would you like to develop/);
 assert.match(view,/One brief for every brand foundation/);
 brief.answers.people='Independent artists';const next=saveWorkspaceBrief(state,brief);
 assert.deepEqual(next.world.packageBrief.outputs,['logo']);assert.equal(next.world.packageBrief.custom,'old brief metadata');assert.equal(JSON.stringify(state),before);
 const noSelections={...brief,outputs:[]};assert.deepEqual(briefMissing(noSelections),[]);
});

test('foundation direction requires the shared questions, without blocking existing asset uploads',()=>{
 assert.throws(()=>saveFoundationDirection(emptyState(),'logo',{notes:'Sculptural',assetIds:[]}),/shared brand questions/);
 const html=workspaceDashboard(emptyState(),'demo','all','',true);
 assert.match(html,/Complete brand questions/);assert.doesNotMatch(html,/Create a logo|Explore typography|Create a palette|outputs selected/);
 assert.match(html,/data-foundation="logo"[^>]* disabled/);
 assert.match(html,/data-review-brief disabled/);assert.doesNotMatch(html,/Add direction|foundation-brief-note/);
 const complete=workspaceDashboard(ready(),'demo','all','',true);assert.match(complete,/data-review-brief >Review brief/);assert.doesNotMatch(complete,/data-review-brief disabled/);assert.match(html,/data-core="logo"/);
});

test('one reference can belong to multiple foundations, without duplicating it or altering shared answers',()=>{
 const state=ready(),before=JSON.stringify(state);
 const logo=saveFoundationDirection(state,'logo',{notes:'A restrained symbol',assetIds:['board','board']});
 const both=saveFoundationDirection(logo,'type',{notes:'Open humanist forms',assetIds:['board']});
 assert.equal(JSON.stringify(state),before);assert.equal(both.assets.length,1);assert.deepEqual(both.world.packageBrief,state.world.packageBrief);
 assert.deepEqual(foundationDirection(both,'logo'),{notes:'A restrained symbol',assetIds:['board']});
 assert.deepEqual(foundationDirection(both,'type'),{notes:'Open humanist forms',assetIds:['board']});
 const detached=saveFoundationDirection(both,'logo',{notes:'A restrained symbol',assetIds:[]});
 assert.equal(detached.assets.length,1);assert.deepEqual(foundationDirection(detached,'type').assetIds,['board']);
 const view=foundationDirectionView(both,'type',foundationDirection(both,'type'));
 assert.match(view,/Pinterest reference/);assert.match(view,/shared brand reference/);assert.match(view,/data-pinterest-open="foundation"/);
});

test('additive directions preserve unknown fields; unsupported containers and unknown references cannot be overwritten',()=>{
 const state={...ready(),world:{...ready().world,foundationDirections:{version:1,custom:'keep',items:{logo:{notes:'Old',assetIds:['board'],provenance:'keep'},future:{any:'keep'}}}}};
 const next=saveFoundationDirection(state,'logo',{notes:'New',assetIds:['board']});
 assert.equal(next.world.foundationDirections.custom,'keep');assert.equal(next.world.foundationDirections.items.logo.provenance,'keep');assert.deepEqual(next.world.foundationDirections.items.future,{any:'keep'});
 assert.throws(()=>saveFoundationDirection(state,'unknown',{notes:'No',assetIds:[]}));
 assert.throws(()=>saveFoundationDirection(state,'logo',{notes:'No',assetIds:['missing']}));
 for(const invalid of [null,[],{version:2,items:{}},{version:1,items:[]}]){
  const old={...ready(),world:{...ready().world,foundationDirections:invalid}},before=JSON.stringify(old);
  assert.throws(()=>saveFoundationDirection(old,'logo',{notes:'No',assetIds:[]}));assert.equal(JSON.stringify(old),before);
 }
});

test('stored direction is rendered as text; missing assets are ignored by the reader',()=>{
 const state=ready(),next=saveFoundationDirection(state,'layout',{notes:'</textarea><script>alert(1)</script>',assetIds:['board']});
 const view=foundationDirectionView(next,'layout',foundationDirection(next,'layout'));
 assert.doesNotMatch(view,/<script>/);assert.match(view,/&lt;script&gt;/);
 const missing={...next,assets:[]};assert.deepEqual(foundationDirection(missing,'layout').assetIds,[]);
});
