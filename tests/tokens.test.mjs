import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {flatten,resolve,compile,valueCSS,contrast,cssName} from '../token-tools.mjs';
const base=new URL('../',import.meta.url),read=n=>readFile(new URL(n,base),'utf8');
const source=JSON.parse(await read('tokens.json')),tokens=flatten(source);
const leaf=(value,type='number')=>({$type:type,$value:value,$description:'Test decision'});
test('every token resolves and generated CSS is current',async()=>{
 assert.equal(compile(source),await read('tokens.css'));
 for(const [name,t] of Object.entries(tokens))assert.ok(valueCSS(t.$type,resolve(tokens,name)));
});
test('reject missing, cyclic and mismatched aliases before writing CSS',()=>{
 assert.throws(()=>compile({a:leaf('{b}')}),/mismatch|Missing/);
 assert.throws(()=>compile({a:leaf('{b}'),b:leaf('{a}')}),/Cyclic/);
 assert.throws(()=>compile({a:leaf('{b}'),b:leaf({value:4,unit:'px'},'dimension')}),/mismatch/);
 assert.throws(()=>compile({a:leaf({value:1,unit:'em'},'dimension')}),/Invalid/);
});
test('CSS aliases preserve the primitive-to-semantic-to-component relationship',()=>{
 const css=compile(source);
 assert.ok(css.includes('--anima-component-field-background: var(--anima-semantic-color-surface-control)'));
 assert.ok(css.includes('--anima-semantic-color-surface-control: var(--anima-primitive-color-aubergine-900)'));
});
test('opaque functional roles meet contrast budgets, independent of decorative water',async()=>{
 const {pairs}=JSON.parse(await read('contrast.json'));
 assert.ok(pairs.length>=8);
 for(const p of pairs){const ratio=contrast(resolve(tokens,p.foreground),resolve(tokens,p.background));assert.ok(ratio>=p.minimum,p.name);assert.equal(Number(ratio.toFixed(2)),p.ratio);}
});
test('all Anima token references in authored component CSS are declared',async()=>{
 const names=new Set(Object.keys(tokens).map(cssName));
 for(const file of (await readdir(base)).filter(name=>name.endsWith('.css'))){
  const css=await read(file);
  for(const [,name] of css.matchAll(/var\((--anima-(?:primitive|semantic|component)-[^,)]+)/g))assert.ok(names.has(name),`${file}: ${name}`);
 }
});
test('atomic composition has all five stages and valid dependencies/token contracts',async()=>{
 const {components}=JSON.parse(await read('atomic.json')),ids=new Set(components.map(c=>c.id));
 assert.equal(ids.size,components.length);
 for(const layer of ['Atom','Molecule','Organism','Template','Page'])assert.ok(components.some(c=>c.layer===layer));
 for(const c of components){for(const dependency of c.uses)assert.ok(ids.has(dependency));for(const token of c.tokens)assert.ok(tokens[token]);assert.ok(c.states.length&&c.remaining);}
});
test('candidate and working library consume the same generated tokens and atoms',async()=>{
 for(const file of ['index.html','components.html']){
  const html=await read(file);
  for(const css of ['tokens.css','interactions.css','atoms.css'])assert.ok(html.includes(`href="${css}"`));
  assert.ok(html.indexOf('tokens.css')<html.indexOf('atoms.css'));
 }
});

test('Wallet uses the shared native fields and actions without a parallel color recipe',async()=>{
 const css=await read('wallet.css'),view=await read('runtime/embedded-wallet.js');
 assert.ok(view.includes('class="anima-field"'));
 assert.ok(view.includes('class="anima-control"'));
 assert.ok(view.includes('class="anima-button"'));
 assert.ok(!view.includes('class="primary"'));
 assert.ok(!/#(?:[0-9a-f]{3,8})\b/i.test(css),'Wallet layout must consume semantic color roles');
});
