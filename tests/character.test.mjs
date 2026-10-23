import test from 'node:test';
import assert from 'node:assert/strict';
import {characterPrompts,characterReady,characterRecord,characterText} from '../runtime/character-model.js';
test('the recovered ICP exercise retains all four distinct questions and their order',()=>{
 assert.deepEqual(characterPrompts.icp.map(p=>p.id),['desire','tension','model','moment']);
 assert.equal(characterPrompts.icp[2].title,'Who makes the movement feel credible?');
 assert.equal(characterReady(characterPrompts.icp[0],'   '),false);
 assert.equal(characterReady(characterPrompts.icp[0],'A meaningful desire, held in tension.'),true);
 assert.equal(characterReady(characterPrompts.icp[0],'x'.repeat(2001)),false);
});
test('character exports preserve supplied contradiction and provenance without inventing observations or a match',()=>{
 const answers={desire:'I want expertise & belonging, but also independence.',tension:'<script>not executable</script> # &cc=other@example.com',model:'An unverified possible guide.',moment:'At the start of a new practice.'};
 const record=characterRecord('icp',answers);
 assert.equal(record.statements[1].text,answers.tension);
 assert.ok(record.statements.every(s=>s.provenance==='You said'));
 assert.deepEqual(record.inferences,[]);assert.equal(record.role,'icp');
 assert.ok(record.verification.includes('No external evidence verified'));
 assert.ok(characterText('icp',answers).includes(answers.model));
 assert.ok(characterText('icp',answers).includes(answers.moment));
});
test('creator questions retain evidence, boundaries and permission; optional metrics are not required numbers',()=>{
 assert.deepEqual(characterPrompts.creator.map(p=>p.id),['expression','voice','world','formats','boundaries','metrics','permission']);
 assert.equal(characterReady(characterPrompts.creator.find(p=>p.id==='metrics'),'Not included'),true);
 assert.equal(characterReady(characterPrompts.creator.find(p=>p.id==='metrics'),''),true);
 const record=characterRecord('creator',{permission:'Only the examples I explicitly share here.'});
 assert.equal(record.statements.at(-1).text,'Only the examples I explicitly share here.');
 assert.ok(record.promptSource.includes('workshop'));
});
test('explicit character handoff survives email preparation as body text, without URL-header injection',async()=>{
 const {introductionEmail}=await import('../water/landing-model.mjs');
 const characterDraft=characterText('creator',{voice:'An intimate voice &cc=other@example.com'});
 const url=new URL(introductionEmail('creator',{name:'A practice',characterDraft}));
 assert.ok(url.searchParams.get('body').includes(characterDraft));assert.equal(url.searchParams.has('cc'),false);
 const older=new URL(introductionEmail('creator',{name:'A practice'}));assert.ok(!older.searchParams.get('body').includes('Character draft'));
});

test('multiple characters keep independent answers, steps and profile expressions',async()=>{
 const {CharacterWorkspace,profileLinks,worksheetRole}=await import('../runtime/character-workspace.js');let n=0;
 const space=new CharacterWorkspace(()=>`draft-${++n}`),first=space.selectKind('talent');first.name='The host';first.answers.voice='Warm, direct and generous.';first.step=3;first.profileInput='https://example.com/voice';
 const second=space.create('talent');second.name='The performer';second.answers.voice='Quiet and theatrical.';
 space.select(first.id);assert.equal(space.active.step,3);assert.equal(space.active.answers.voice,'Warm, direct and generous.');assert.equal(space.active.profileInput,'https://example.com/voice');
 space.selectKind('icp');space.active.answers.desire='An independent practice.';space.selectKind('talent');assert.equal(space.active.id,first.id);
 space.select(second.id);space.discard();assert.equal(space.active.id,first.id);assert.equal(space.active.answers.voice,'Warm, direct and generous.');
 assert.equal(worksheetRole('talent'),'creator');assert.equal(worksheetRole('icp'),'icp');
 const sameProfile=profileLinks('https://example.com/voice\nhttps://example.com/voice');assert.deepEqual(sameProfile.links,['https://example.com/voice']);assert.equal(sameProfile.error,'');
 assert.ok(profileLinks('javascript:alert(1)').error);assert.ok(profileLinks('https://user:secret@example.com').error);assert.ok(profileLinks('not a profile').error);
});
test('optional character metadata preserves the legacy worksheet contract and provenance',()=>{
 const legacy=characterRecord('creator',{voice:'A self-supplied point of view.'});assert.equal(legacy.schema,'anima.character-draft.v1');assert.equal(legacy.character,undefined);
 const metadata={id:'draft-example',kind:'talent',name:'The warm host',profileLinks:['https://example.com/host']};
 const current=characterRecord('creator',{voice:'Warm and direct.'},metadata);
 assert.equal(current.role,'creator');assert.equal(current.schema,legacy.schema);assert.equal(current.character.kind,'talent');assert.equal(current.statements[0].question,'How does this character show up?');assert.deepEqual(current.inferences,[]);
 const text=characterText('creator',{voice:'Warm and direct.'},metadata);assert.ok(text.startsWith('Talent character'));assert.ok(text.includes('The warm host'));assert.ok(text.includes('https://example.com/host'));
});
test('talent character handoff remains body text in the roster request',async()=>{
 const {introductionEmail}=await import('../water/landing-model.mjs');
 const text=characterText('creator',{voice:'Own voice &cc=someone@example.com'},{id:'example',kind:'talent',name:'A host',profileLinks:[]});
 const url=new URL(introductionEmail('talent',{name:'Example only',characterDraft:text}));
 assert.ok(url.searchParams.get('body').includes(text));assert.equal(url.searchParams.has('cc'),false);
});
test('workspace limits preserve every context and discard only the selected draft',async()=>{
 const {CharacterWorkspace}=await import('../runtime/character-workspace.js');let n=0;const space=new CharacterWorkspace(()=>`limit-${++n}`);
 const audience=space.selectKind('icp');audience.answers.desire='Keep this audience intact.';
 while(space.canCreate)space.create('creator');assert.throws(()=>space.create('talent'),/sixteen/);
 space.selectKind('talent');space.discard();assert.equal(space.active.kind,'talent');assert.equal(space.active.step,0);
 space.select(audience.id);assert.equal(space.active.answers.desire,'Keep this audience intact.');
});
