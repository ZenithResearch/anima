import test from 'node:test';
import assert from 'node:assert/strict';
import {fileReference,linkReference,readReferences,referenceURL,isPinterestURL,MAX_REFERENCE_BYTES} from '../runtime/brand-references-model.js';
import {brandQuestions,readBrandPackage,emptyBrandPackage,answeredCount,brandPackageText} from '../runtime/brand-package-model.js';
test('world asks about perception; optional moments do not request a designed gesture',async()=>{
 const q=brandQuestions.find(q=>q.id==='world');assert.match(q.prompt,/encounters/);assert.match(q.prompt,/understand/);assert.doesNotMatch(q.prompt,/feeling you want to create/);
 const {answerFields}=await import('../runtime/brand-package-model.js');const moments=answerFields.find(f=>f.id==='signature');assert.equal(moments.required,false);assert.match(moments.prompt,/moments, stories/);assert.doesNotMatch(moments.prompt,/gesture/);
});
test('ordinary websites and Pinterest boards are normalized without accepting credentials or active schemes',()=>{
 assert.equal(referenceURL('example.com/world'),'https://example.com/world');
 for(const raw of ['javascript:alert(1)','data:text/html,hello','https://user:secret@example.com/','https://',''])assert.equal(referenceURL(raw),null);
 const ref=linkReference('https://au.pinterest.com/example/quiet-world/','board-1');assert.equal(ref.kind,'pinterest');
 assert.equal(isPinterestURL('https://pinterest.com.evil.example/board'),false);assert.equal(isPinterestURL('https://pin.it/abc123'),true);
 assert.equal(linkReference('https://example.com/','site-1').kind,'link');
});
test('all file metadata is bounded before a batch can be accepted',()=>{
 assert.deepEqual(fileReference({name:'palette.png',size:1024,type:'image/png'},'file-1'),{id:'file-1',kind:'file',name:'palette.png',size:1024,type:'image/png'});
 for(const size of [-1,NaN,MAX_REFERENCE_BYTES+1])assert.throws(()=>fileReference({name:'large.png',size,type:'image/png'},'file-1'));
 assert.throws(()=>fileReference({name:'',size:10,type:''},'file-1'));assert.throws(()=>fileReference({name:'a',size:10,type:''},'../../unsafe'));
});
test('reference readers reject unsafe links, bound counts and de-duplicate IDs and URLs',()=>{
 const first=linkReference('https://example.com','one');
 const refs=readReferences([first,{...first,id:'two'},{id:'bad',kind:'link',url:'javascript:alert(1)'},{id:'three',kind:'file',name:'palette.png',size:2048,type:'image/png'}]);
 assert.equal(refs.length,2);assert.equal(refs[1].kind,'file');
 assert.equal(readReferences(Array.from({length:30},(_,i)=>linkReference(`https://example.com/${i}`,`id-${i}`))).length,12);
});
test('legacy answers and notes survive without being silently treated as the new feeling prompt',()=>{
 const legacy=readBrandPackage({version:1,answers:{signature:'Old signature response',references:'Old mood notes'}});
 assert.equal(legacy.answers.signature,'Old signature response');assert.equal(legacy.answers.references,'Old mood notes');assert.equal(legacy.promptSet,undefined);
 assert.match(brandPackageText(legacy),/Earlier signature response \(retained\)/);
 assert.equal(emptyBrandPackage().promptSet,'experience-v3');
});
test('references are additive and count as one optional step; exports identify links and originals',()=>{
 const draft=readBrandPackage({version:1,answers:{},references:[linkReference('https://pinterest.com/example/board/','board-1'),fileReference({name:'pool.png',size:44,type:'image/png'},'file-1')]});
 assert.equal(answeredCount(draft),1);assert.equal(draft.references.length,2);
 assert.match(brandPackageText(draft),/Pinterest: https:\/\/pinterest.com\/example\/board\//);assert.match(brandPackageText(draft),/File: pool.png/);
 assert.equal(JSON.stringify(draft).includes('email'),false);
});
