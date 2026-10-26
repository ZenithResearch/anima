import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServiceSignerSelection,serviceSignerChoiceView} from '../runtime/service-signer-selection.js';
const wallet={getStatus:async()=>({state:'ready'}),getMembership:async()=>assert.fail('selection must not infer membership'),getCapabilities:async()=>[],presentCredential:async()=>assert.fail('selection must not sign')};

test('Transfer is listed first but unavailable until an actual adapter is supplied; browser selection is explicit',async()=>{
 let browser=0;const s=createServiceSignerSelection({browser:async()=>{browser++;return wallet;}});assert.deepEqual(s.choices().map(c=>[c.kind,c.available]),[['transfer',false],['browser',true]]);assert.equal(browser,0);
 assert.deepEqual(await s.connect('transfer'),{state:'unavailable',kind:'transfer'});assert.equal(browser,0);
 assert.equal((await s.connect('browser')).wallet,wallet);assert.equal(browser,1);
});

test('native failure, denial or absence never silently invokes another signer or substitutes identity',async()=>{
 for(const port of [async()=>null,async()=>{throw Error('native unavailable');}]){let browser=0;const s=createServiceSignerSelection({transfer:port,browser:async()=>{browser++;return wallet;}});assert.notEqual((await s.connect('transfer')).state,'connected');assert.equal(browser,0);assert.equal((await s.connect('browser')).kind,'browser');assert.equal(browser,1);}
});

test('only one explicit connection can be pending and page closure ignores a late successful result',async()=>{
 let finish;const s=createServiceSignerSelection({transfer:()=>new Promise(r=>{finish=r;}),browser:()=>assert.fail('second signer must not open')});const pending=s.connect('transfer');assert.equal((await s.connect('browser')).state,'busy');s.dispose();finish(wallet);assert.deepEqual(await pending,{state:'context-changed',kind:'transfer'});assert.equal((await s.connect('transfer')).state,'context-changed');
});

test('unknown choices and adapter exceptions cannot become a successful connection or leak private errors',async()=>{
 const s=createServiceSignerSelection({browser:async()=>{throw Error('private-device-data');}});await assert.rejects(s.connect('automatic'),/supported/);const result=await s.connect('browser');assert.equal(result.state,'unavailable');assert.doesNotMatch(JSON.stringify(result),/private-device-data/);
});

test('candidate renders native unavailable and explicit browser choice without an automatic native launch or backup import',async()=>{
 const s=createServiceSignerSelection({browser:async()=>null});const html=serviceSignerChoiceView(s.choices());assert.match(html,/id="connect-transfer-wallet"[^>]*disabled/);assert.match(html,/Use browser Wallet/);assert.match(html,/not available in this build/);
 const source=await readFile(new URL('../src/service-candidate.ts',import.meta.url),'utf8');assert.match(source,/createServiceSignerSelection\(\{browser:/);assert.doesNotMatch(source,/window\.open|location\.assign|zenith-transfer:|restore\(/);assert.match(source,/signers\.dispose\(\)/);
});
