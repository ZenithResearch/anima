import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as raw from '../integrations/secs/libsec_core.js';
import {createBrowserIntakeEnvelopeSealer} from '../integrations/reviewed-sealer.js';
const root=new URL('../',import.meta.url), wasm=await readFile(new URL('integrations/secs/libsec_core_bg.wasm',root));
raw.initSync({module:wasm});
const hash=v=>createHash('sha256').update(v).digest('hex');
const key='13be4feaeaf204c7fd3358fc9c00721881d174278128227ec674f37f7fe97b6d';
const bytes=s=>new TextEncoder().encode(s);
test('licensed source-qualified producer artifacts match every recorded digest',async()=>{
 const pin=JSON.parse(await readFile(new URL('SEALER-SOURCE.json',root),'utf8'));
 for(const f of pin.runtimeIntegration.artifacts)assert.equal(hash(await readFile(new URL(f.name,root))),f.sha256,f.name);
 assert.match(await readFile(new URL('integrations/secs/LICENSE',root),'utf8'),/MIT License/);
});
test('real producer WASM reproduces canonical request and original reference vectors',()=>{
 const recipient=Uint8Array.from(Buffer.from(key,'hex')), ephemeral=new Uint8Array(32).fill(8),nonce=new Uint8Array(12).fill(9);
 assert.equal(hash(raw.wasm_seal_intake_envelope_v1(recipient,ephemeral,nonce,bytes('{"schema":"service.intake.v1"}'),bytes('signed-membership-proof'),2000n)),'51e76c5367fb192e9ae967c910dce2dd739797253d34bf762b53f1ad287219e4');
 const original=bytes('original visual reference');
 assert.equal(hash(raw.wasm_seal_reference_object_envelope_v1(recipient,ephemeral,nonce,'request-1','submit-1','reference-1',Uint8Array.from(Buffer.from(hash(original),'hex')),original,bytes('signed-requester-evidence'),2000n)),'bb7e6b159d244cffee2f15005cd880d53aa05acf3780bfdc03548cf27253157c');
});
test('real producer randomizes ciphertext and rejects expiry and changed original digest',async()=>{
 const sealer=await createBrowserIntakeEnvelopeSealer({moduleOrPath:wasm}),now=Date.now();
 const profile={schema:'service.intake-envelope.v1',algorithm:'x25519-hkdf-sha256-chacha20poly1305',recipient_key_id:'tunnel:x25519:0f6d2553ff0c0f447ae202edd84383e1',recipient_public_key_hex:key,not_before:new Date(now-1000).toISOString(),not_after:new Date(now+120000).toISOString()};
 const input={intake:bytes('{"schema":"service.intake.v1"}'),requester_evidence:bytes('disposable evidence'),profile,expires_at_ms:now+60000};
 const a=await sealer.seal(input),b=await sealer.seal(input);
 assert.notEqual(hash(a),hash(b));assert.ok(!Buffer.from(a).includes(Buffer.from('disposable evidence')));
 await assert.rejects(sealer.seal({...input,expires_at_ms:now-1}));
 const object=bytes('original');
 const reference={request_id:'r1',idempotency_key:'i1',artifact_id:'a1',content_hash:hash(object),object,requester_evidence:input.requester_evidence,profile:{...profile,schema:'service.reference-object-envelope.v1'},expires_at_ms:now+60000};
 assert.ok((await sealer.sealReferenceObject(reference)).byteLength>object.byteLength);
 await assert.rejects(sealer.sealReferenceObject({request_id:'r1',idempotency_key:'i1',artifact_id:'a1',content_hash:'00'.repeat(32),object,requester_evidence:input.requester_evidence,profile:{...profile,schema:'service.reference-object-envelope.v1'},expires_at_ms:now+60000}));
});
