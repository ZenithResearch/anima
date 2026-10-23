import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {navigationState,navigationEntry,canNavigateBack} from '../runtime/navigation-history.js';
const page='http://127.0.0.1:4337/index.html?water-view=pond';
test('direct entry has no invented history and malformed metadata cannot enable Back',()=>{
 const direct=navigationState(null,page+'#business-start',null);
 assert.equal(canNavigateBack(direct,page+'#business-start'),false);
 for(const state of [null,42,{}, {'anima.intake.navigation.v1':{href:page,previous:42}}])assert.equal(navigationEntry(state),null);
});
test('modal history retains exact predecessor and preserves other route state',()=>{
 const original={otherFeature:{selected:3}};
 const talent=navigationState(original,page+'#talent-start',page+'#talent');
 const character=navigationState(talent,page+'#character',page+'#talent-start');
 assert.deepEqual(character.otherFeature,original.otherFeature);
 assert.deepEqual(original,{otherFeature:{selected:3}});
 assert.equal(navigationEntry(character).previous,page+'#talent-start');
 assert.equal(canNavigateBack(character,page+'#character'),true);
 assert.equal(canNavigateBack(character,page+'#introduction'),false);
 assert.equal(navigationEntry(talent).previous,page+'#talent');
});
test('a different origin or invalid predecessor cannot trigger an automatic Back',()=>{
 for(const previous of ['https://unrelated.example/private','invalid'])assert.equal(canNavigateBack(navigationState(null,page,previous),page),false);
});
test('business questions keep atomic intake while Enter Workspace opens the actual workspace',async()=>{
 const base=new URL('../',import.meta.url),html=await readFile(new URL('index.html',base),'utf8');
 assert.match(html,/href="workspace\.html"[^>]*><span class="action-label">Enter Workspace/);
 const workspace=await readFile(new URL('workspace.html',base),'utf8');
 assert.match(workspace,/id="workspace-content"/);assert.doesNotMatch(workspace,/data-workspace-back/);assert.match(workspace,/class="wordmark workspace-home" href="workspace.html"/);
 const controller=await readFile(new URL('src/brand-workspace.ts',base),'utf8');
 assert.doesNotMatch(controller,/if\(url.searchParams.get\('onboarding'\)===.brand.\)\{openDiscovery/);
 assert.equal([...html.matchAll(/data-intake-back/g)].length,5);
 assert.match(html,/data-business-screen="brand-account"/);
 assert.match(html,/data-density="compact"/);
});
