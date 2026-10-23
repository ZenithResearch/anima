import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {brandQuestions,emptyBrandPackage,readBrandPackage,answeredCount,missingBrandQuestions,brandPackageText,deliveryEmail,maySavePreview,setPeople,peopleDescriptions} from '../runtime/brand-package-model.js';
test('empty and partially answered brand drafts remain usable without brand or identity fields',()=>{
 const draft=emptyBrandPackage();assert.equal(answeredCount(draft),0);
 draft.answers.world='A quiet, luminous pool';assert.equal(answeredCount(draft),1);
 assert.match(brandPackageText(draft),/A quiet, luminous pool/);
 assert.match(brandPackageText(draft),/Left open/);
 assert.equal(Object.hasOwn(draft,'email'),false);assert.equal(Object.hasOwn(draft,'organization'),false);
});
test('preview storage strips contact metadata and unknown fields; bounds retained answers',()=>{
 const draft=readBrandPackage({version:1,email:'private@example.test',account:{id:'not-authentication'},answers:{feeling:'A'.repeat(5000),people:42,world:'water',unknown:'discard'}});
 assert.equal(draft.answers.feeling.length,4000);assert.equal(draft.answers.people,undefined);
 assert.equal(JSON.stringify(draft).includes('private@example.test'),false);
 assert.equal(JSON.stringify(draft).includes('not-authentication'),false);
 assert.deepEqual(Object.keys(draft.answers),['feeling','world']);
});
test('a new preview cannot overwrite incompatible or corrupt saved drafts',()=>{
 for(const raw of [null,42,{},[],{version:2,answers:{}},{version:1,answers:[]},{version:1}])assert.equal(readBrandPackage(raw),null);
 assert.equal(maySavePreview(null),true);assert.equal(maySavePreview(JSON.stringify(emptyBrandPackage())),true);
 for(const saved of ['broken',JSON.stringify({version:2,answers:{world:'future'}})])assert.equal(maySavePreview(saved),false);
});
test('email parser recognizes supplied addresses; delivery handles blank as optional',()=>{
 assert.equal(deliveryEmail('  someone@example.test '),'someone@example.test');
 for(const value of ['', 'missing-at.example','someone@','a b@example.test','a'.repeat(201)+'@example.test'])assert.equal(deliveryEmail(value),null);
});
test('Bento questions keep unrestricted workspace entry separate from package creation',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const start=html.slice(html.indexOf('data-business-screen="business-start"'),html.indexOf('data-business-screen="brand-account"'));
 assert.match(start,/class="brand-preview-grid"/);
 for(const q of brandQuestions)assert.match(start,new RegExp(`data-brand-question-card="${q.id}"`));
 assert.match(start,/href="workspace\.html"/);assert.match(start,/data-create-brand-package/);
 assert.doesNotMatch(html,/Preview the questions|Skip for now|All questions are optional/);
 assert.match(start,/Enter Workspace/);assert.match(start,/Create your brand package/);
 assert.doesNotMatch(start,/500|\$250|\$500/);
 for(const id of ['brand','people','body','emotion','world','signature','references'])assert.match(html,new RegExp(`id="brand-answer-${id}"`));
 assert.match(html,/<anima-brand-references>/);assert.match(html,/type="file" multiple/);
 const delivery=html.slice(html.indexOf('data-business-screen="brand-delivery"'),html.indexOf('data-business-screen="brand-workspace"'));
 assert.equal([...delivery.matchAll(/<input /g)].length,1);assert.match(delivery,/name="deliveryEmail"/);
 const source=await readFile(new URL('../src/business-onboarding.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/fetch\(|stageIntroduction|consumeIntroduction|location\.assign|sessionStorage/);
 assert.match(source,/No account or package request has been created/);
});

test('package creation needs four core cards, not invented moments, physical responses or references',()=>{
 const draft=emptyBrandPackage();assert.deepEqual(missingBrandQuestions(draft),['brand','people','feeling','world']);
 Object.assign(draft.answers,{brand:'Owned infrastructure',emotion:'Confidence',world:'Inspectable work'});setPeople(draft,['Operators']);
 assert.deepEqual(missingBrandQuestions(draft),[]);
 setPeople(draft,['Operators',' ']);assert.deepEqual(missingBrandQuestions(draft),['people']);
});
test('people descriptions are separate, bounded and backward compatible',()=>{
 const legacy=readBrandPackage({version:1,answers:{people:'An accepted paragraph',feeling:'An earlier feeling'}});
 assert.deepEqual(peopleDescriptions(legacy),['An accepted paragraph']);assert.equal(legacy.answers.feeling,'An earlier feeling');
 const draft=emptyBrandPackage();setPeople(draft,['One','Two']);const copy=readBrandPackage(JSON.parse(JSON.stringify(draft)));
 assert.deepEqual(copy.peopleEntries,['One','Two']);assert.equal(copy.answers.people,'1. One\n\n2. Two');
 assert.throws(()=>setPeople(draft,Array(8).fill('x')),/seven/);
 assert.equal(readBrandPackage({version:1,answers:{},peopleEntries:Array(8).fill('x')}),null);
 assert.equal(readBrandPackage({version:1,answers:{},promptSet:'future'}),null);
 const seven=emptyBrandPackage();setPeople(seven,Array(7).fill('x'.repeat(4000)));assert.equal(readBrandPackage(seven).peopleEntries[6].length,4000);
 assert.match(brandPackageText(seven),/People · 7/);
});
