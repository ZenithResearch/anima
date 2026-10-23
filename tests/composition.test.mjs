import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,access} from 'node:fs/promises';
import {copy} from '../copy.mjs';
const base=new URL('../',import.meta.url),html=await readFile(new URL('index.html',base),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
test('composition preserves the landing controller hooks without duplicate IDs',()=>{
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['presence','motion','mobile-menu','menu-toggle','menu-close','role-panel','role-title','role-intro','step-panel','step-count','step-title','step-copy','step-prompts','step-outcome','introduction','introduction-title','introduction-copy','introduction-receipt','talent-agent-fields','project-form','project-review','project-recap','project-email','edit-project','error-summary','draft-status','earlier-drafts','earlier-list','entry-context'])assert.ok(ids.includes(id),id);
 for(const type of ['creator','talent','client'])assert.ok(html.includes(`data-intro-form="${type}"`));
});
test('every static in-page navigation target has a matching destination',()=>{
 for(const [,target] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(target),target);
});
test('candidate references available local assets',async()=>{
 for(const [,ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  if(!ref.startsWith('../')&&!ref.startsWith('assets/')&&!/^(production\.css|interactions\.css)$/.test(ref))continue;
  const url=new URL(ref,base);
  await access(url);
 }
});
test('network-led composition keeps detailed business copy in its own section',()=>{
 assert.equal(copy.category,'A creative network');assert.equal(copy.entries.length,2);
 assert.ok(html.indexOf('id="pathways"')<html.indexOf('id="practice"'));
 const main=html.slice(html.indexOf('<main'),html.indexOf('</main>'));
 assert.ok(!main.includes('<form'));
 assert.ok(html.includes('<dialog class="intake-panel" id="introduction-panel"'));
 assert.ok(html.includes('<dialog class="intake-panel" id="project-panel"'));
 assert.ok(main.includes('data-water-life="pisces"'));
 assert.ok(main.includes('data-water-life="jellyfish"'));
 assert.ok(html.includes('data-role-entry="talent"'));
});
test('working specimens have a local script and links to complete organisms',async()=>{
 const gallery=await readFile(new URL('components.html',base),'utf8');
 for(const id of ['actions','fields','choices','receipts','disclosure','organisms'])assert.ok(gallery.includes(`id="${id}"`));
 assert.ok(gallery.includes('src="runtime/specimens.js"'));await access(new URL('runtime/specimens.js',base));
});
test('readiness data exposes integration gaps and actual candidate anchors',async()=>{
 const r=JSON.parse(await readFile(new URL('readiness.json',base),'utf8'));
 for(const item of r.components){assert.ok(item.remaining);if(item.target.startsWith('index.html#'))assert.ok(ids.includes(item.target.split('#')[1]),item.name);}
 assert.ok(r.components.some(c=>c.status==='Not integrated'));
 assert.ok(r.cutoverGates.some(g=>g.includes('provider consent')));
});

test('decorated actions retain native links and escaped accessible content',async()=>{
 const {Action}=await import('../runtime/page.js');
 const markup=Action({label:'A <studio> & friends',href:'#introduction',role:'creator',primary:true});
 assert.ok(markup.includes('<anima-surface>'));assert.ok(markup.includes('href="#introduction"'));assert.ok(markup.includes('data-role-entry="creator"'));
 assert.ok(markup.includes('A &lt;studio&gt; &amp; friends'));assert.ok(markup.includes('class="arrow-lens" aria-hidden="true"'));
 const gallery=await readFile(new URL('components.html',base),'utf8');
 for(const id of ['orbs','orb-controls','orb-reading','orb-thought','orb-thought-response'])assert.ok(gallery.includes(`id="${id}"`));
});

test('composed accessible descriptions and names reference real elements',()=>{
 for(const [,references] of html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)){
  for(const reference of references.split(/\s+/))assert.ok(ids.includes(reference),reference);
 }
});

test('the pond has a single settled koi and five quiet habitat accents, without comparison controls',()=>{
 assert.ok(!html.includes('data-about-life='));assert.ok(!html.includes('life-choices'));
 assert.equal([...html.matchAll(/data-water-life="koi"/g)].length,1);
 const accents=[...html.matchAll(/data-water-life="([^"]+)" data-water-life-distant/g)].map(m=>m[1]);
 assert.deepEqual(new Set(accents),new Set(['sea-angel','betta','ray','seaweed','anemone']));
 assert.equal([...html.matchAll(/data-water-life="/g)].length,8);
});
