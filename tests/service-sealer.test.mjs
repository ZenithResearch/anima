import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {candidateIntakeSealer,browserSealerReadiness} from '../runtime/service-sealer.js';
import {configuredProviders,providerActionsEnabled,liveProvider,unavailableAccess} from '../runtime/service-adapter.js';

test('browser sealer declaration is the exact pinned producer source, without a runtime crypto copy',async()=>{
 const root=new URL('../',import.meta.url),pin=JSON.parse(await readFile(new URL('SEALER-SOURCE.json',root),'utf8')),bytes=await readFile(new URL('src/vendor/secs-intake-sealer.d.ts',root));
 assert.equal(pin.producerCommit,'a6cda6d99a8f8674c1264dd4258ddf16f9a048fc');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.declaration.sha256);
 assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),'9e75fbefb3d409a4dce44dae55beec6eec59ed03');
 assert.equal(browserSealerReadiness,'source-qualified-unreleased');
});

test('missing or failed producer sealer never substitutes browser crypto or enables live submission',async()=>{
 await assert.rejects(candidateIntakeSealer().seal({}),/sealer package is not installed/);
 let loads=0;const unavailable=Error('Candidate package unavailable'),sealer=candidateIntakeSealer(async()=>{loads++;throw unavailable;});
 await assert.rejects(sealer.seal({}),error=>error===unavailable);
 await assert.rejects(sealer.seal({}),error=>error===unavailable);
 assert.equal(loads,1);assert.deepEqual(configuredProviders,[]);
 const provider=liveProvider({baseUrl:'https://intake.example',access:unavailableAccess,authorize:async()=>{throw Error('Unexpected consent');},fetch:async()=>{throw Error('Unexpected send');}});
 assert.equal(providerActionsEnabled(provider),false);
 await assert.rejects(provider.upload({},new Uint8Array([1])),/Live delivery is not qualified/);
});

test('injected candidate producer owns sealing and receives the SDK port without an Anima transform',async()=>{
 let loads=0,factories=0;const inputs=[],output=new Uint8Array([83,69,67,83]);
 const sealer=candidateIntakeSealer(async()=>{loads++;return {async createBrowserIntakeEnvelopeSealer(){factories++;return {async seal(input){inputs.push(input);return output;}};}};});
 assert.equal(loads,0);
 const input={intake:new Uint8Array([1]),requester_evidence:new Uint8Array([2]),profile:{schema:'service.intake-envelope.v1'},expires_at_ms:1};
 assert.equal(await sealer.seal(input),output);assert.equal(await sealer.seal(input),output);
 assert.equal(inputs[0],input);assert.deepEqual([loads,factories],[1,1]);
 // An injected test producer verifies port composition only, not encryption.
});

test('reference object port preserves stable identities, original bytes and evidence for the producer',async()=>{
 let factories=0;const calls=[],envelope=new Uint8Array([83,69,67,83,82]);
 const sealer=candidateIntakeSealer(async()=>({async createBrowserIntakeEnvelopeSealer(){factories++;return {async seal(){return new Uint8Array([1]);},async sealReferenceObject(input){calls.push(input);return envelope;}};}}));
 const input={request_id:'same-request',idempotency_key:'same-key',artifact_id:'same-original',content_hash:'a'.repeat(64),object:new Uint8Array([1,2,3]),requester_evidence:new Uint8Array([4,5]),profile:{schema:'service.reference-object-envelope.v1'},expires_at_ms:1234};
 assert.equal(await sealer.sealReferenceObject(input),envelope);
 await sealer.seal({});assert.equal(factories,1);
 assert.equal(calls[0],input);assert.equal(calls[0].object,input.object);assert.equal(calls[0].requester_evidence,input.requester_evidence);
 assert.equal(calls[0].profile.schema,'service.reference-object-envelope.v1');
 // This is a stub call, not preparation, a resend or an encryption vector test.
});

test('missing reference-object support fails without downgrading to intake sealing or plaintext upload',async()=>{
 let intakeCalls=0;
 await assert.rejects(candidateIntakeSealer().sealReferenceObject({}),/not installed/);
 const oldProducer=candidateIntakeSealer(async()=>({async createBrowserIntakeEnvelopeSealer(){return {async seal(){intakeCalls++;return new Uint8Array([1]);}};}}));
 await assert.rejects(oldProducer.sealReferenceObject({}),/does not support encrypted reference objects/);
 assert.equal(intakeCalls,0);assert.deepEqual(configuredProviders,[]);
});
