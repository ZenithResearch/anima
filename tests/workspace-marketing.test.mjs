import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../workspace/domain.mjs';
import {marketingWorkspace,saveMarketingWorkspace,parsePalette,folderForAsset,proposedSeats} from '../runtime/workspace-marketing-model.js';
const scope='test-workspace';
test('old workspace drafts remain unchanged; scoped seats are proposals rather than bookings',()=>{
 const state=emptyState(),before=JSON.stringify(state),settings=marketingWorkspace(state,scope);
 assert.equal(JSON.stringify(state),before);assert.equal(settings.identity.logoAssetId,'');assert.deepEqual(settings.identity.palette,[]);
 assert.equal(settings.seats.length,3);assert.ok(settings.seats.every(s=>s.state==='proposed'&&s.responsibilities.length===5));
 assert.notDeepEqual(proposedSeats('other-workspace').map(s=>s.id),settings.seats.map(s=>s.id));
 assert.equal(JSON.stringify(settings).includes('booking'),false);
});
test('palette parsing normalizes colors and rejects CSS, names, malformed hex and excess colors',()=>{
 assert.deepEqual(parsePalette('#abc, #38213b\n#AABBCC'),['#AABBCC','#38213B']);assert.deepEqual(parsePalette(''),[]);
 for(const bad of ['red','#12','#abcd','url(https://example.com/a)','#fff; background:red',Array(9).fill('#ffffff').join(' ')])assert.throws(()=>parsePalette(bad));
});
test('saving core identity is additive and preserves original assets, unrelated world fields and legacy associations',()=>{
 const state={...emptyState(),assets:[{id:'logo-1',kind:'file',name:'logo.png'},{id:'font-1',kind:'file',name:'type.woff2'}],world:{custom:{kept:true},pieces:{identity:{assetIds:['logo-1']}},brandQuestionnaire:{version:2,answers:{firstPull:'Original words'}}}};
 const before=JSON.stringify(state),settings=marketingWorkspace(state,scope);
 settings.identity={logoAssetId:'logo-1',fontFamily:'Example Sans',fontAssetIds:['font-1'],palette:['#38213B']};
 const next=saveMarketingWorkspace(state,settings);
 assert.equal(JSON.stringify(state),before);assert.deepEqual(next.assets,state.assets);assert.deepEqual(next.world.pieces,state.world.pieces);assert.deepEqual(next.world.brandQuestionnaire,state.world.brandQuestionnaire);assert.deepEqual(next.world.custom,state.world.custom);
 assert.deepEqual(marketingWorkspace(next,scope).identity,settings.identity);
});
test('asset library resolves older deliverable links and explicit organization without copying source files',()=>{
 const asset={id:'a',name:'voice.txt',kind:'file'},state={...emptyState(),assets:[asset],world:{pieces:{voice:{assetIds:['a']}}}};
 const settings=marketingWorkspace(state,scope);assert.equal(folderForAsset(state,asset,settings),'voice');
 settings.assetFolders.a='strategy';const next=saveMarketingWorkspace(state,settings);assert.equal(folderForAsset(next,asset,marketingWorkspace(next,scope)),'strategy');assert.equal(next.assets[0],asset);
 assert.equal(folderForAsset(emptyState(),{id:'b',name:'other',kind:'link'},marketingWorkspace(emptyState(),scope)),'references');
});
test('invalid asset references and future marketing settings cannot overwrite stored records',()=>{
 const state=emptyState(),settings=marketingWorkspace(state,scope);settings.identity.logoAssetId='missing';assert.throws(()=>saveMarketingWorkspace(state,settings));
 settings.identity.logoAssetId='';settings.assetFolders.missing='identity';assert.throws(()=>saveMarketingWorkspace(state,settings));
 const future={...emptyState(),world:{marketingWorkspace:{version:2,identity:{future:'keep me'}}}},before=JSON.stringify(future);
 assert.throws(()=>saveMarketingWorkspace(future,marketingWorkspace(future,scope)));assert.equal(JSON.stringify(future),before);
 for(const invalid of [null,[],42,{version:1.5}]){const old={...emptyState(),world:{marketingWorkspace:invalid}};assert.throws(()=>saveMarketingWorkspace(old,marketingWorkspace(old,scope)));assert.equal(old.world.marketingWorkspace,invalid);}
});

const {workspaceBrief,saveWorkspaceBrief,briefMissing}=await import('../runtime/workspace-marketing-model.js');
const {workspaceDashboard}=await import('../runtime/workspace-marketing-view.js');
test('workspace package briefs keep partial answers and selected outputs without changing original resources or other questionnaire contracts',()=>{
 const source={...emptyState(),assets:[{id:'ref',name:'original.png',kind:'file'}],world:{brandQuestionnaire:{version:2,answers:{firstPull:'Keep this'}},packageBrief:{version:1,custom:'preserved',answers:{feeling:'An original feeling'},assetIds:['ref'],outputs:['logo']}}};
 const before=JSON.stringify(source),brief=workspaceBrief(source);assert.deepEqual(briefMissing(brief),['people','world','signature']);
 brief.outputs=['logo','type','palette'];brief.answers.people='Independent makers';
 const next=saveWorkspaceBrief(source,brief);
 assert.equal(JSON.stringify(source),before);assert.equal(next.world.packageBrief.custom,'preserved');assert.deepEqual(next.world.brandQuestionnaire,source.world.brandQuestionnaire);assert.deepEqual(next.assets,source.assets);
 assert.deepEqual(workspaceBrief(next).outputs,['logo','type','palette']);assert.equal(workspaceBrief(next).answers.people,'Independent makers');
});
test('brief completion needs all five meanings and source material; unsupported records cannot be overwritten',()=>{
 const state=emptyState(),brief=workspaceBrief(state);brief.promptSet='feeling-v2';brief.answers={feeling:'a',people:'b',world:'c',signature:'d'};assert.deepEqual(briefMissing(brief),['references']);
 brief.answers.references='Earlier reference notes';assert.deepEqual(briefMissing(brief),[]);
 for(const invalid of [null,[],42,{version:2}]){const old={...state,world:{packageBrief:invalid}};assert.throws(()=>saveWorkspaceBrief(old,brief));assert.equal(old.world.packageBrief,invalid);}
 assert.throws(()=>saveWorkspaceBrief(state,{...brief,assetIds:['missing']}));assert.throws(()=>saveWorkspaceBrief(state,{...brief,outputs:['unknown']}));
});
test('minimal dashboard keeps association controls while outward deliverables require actual linked assets',()=>{
 const html=workspaceDashboard(emptyState(),'example','all','',true);
 for(const id of ['workspace-inputs','workspace-foundations','workspace-outward'])assert.ok(html.includes(`id="${id}"`));
 for(const id of ['brand-book','characters','voice','identity','design-system','creative-assets'])assert.ok(html.includes(`data-piece="${id}"`));
 for(const id of ['logo','type','palette']){assert.ok(html.includes(`data-core="${id}"`));assert.ok(html.includes(`data-foundation="${id}"`));}
 assert.ok(html.indexOf('id="identity-title"')<html.indexOf('id="workspace-inputs"'));
 assert.ok(html.includes('data-invite-team'));assert.ok(html.includes('data-find-teammates'));
 assert.equal(html.includes('data-seat='),false);assert.equal(html.includes('Your brand, at hand.'),false);
 const output=(value)=>value.split('id="workspace-outward"')[1].split('</section>')[0];
 assert.ok(output(html).includes('No deliverables yet.'));assert.equal(output(html).includes('Campaigns &amp; content'),false);
 const source={...emptyState(),assets:[{id:'source',name:'source-only.png',kind:'file'},{id:'output',name:'finished-site.html',kind:'file'}],world:{pieces:{'creative-assets':{assetIds:['output','missing']}}}};
 const visible=output(workspaceDashboard(source,'example','all','',true));assert.ok(visible.includes('finished-site.html'));assert.equal(visible.includes('source-only.png'),false);assert.equal(visible.includes('No deliverables yet.'),false);

 const state={...emptyState(),brand:{name:'<img src=x onerror=alert(1)>'}};assert.equal(workspaceDashboard(state,'example','all','',true).includes('<img src=x'),false);
});
