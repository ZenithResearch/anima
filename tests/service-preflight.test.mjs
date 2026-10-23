import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FixtureProvider,exampleOriginal} from '../runtime/service-fixture.js';
import {prepareServiceReview,digest} from '../runtime/service-review-model.js';
import {encryptedOutboxStore,prepareEncryptedOutbox} from '../runtime/service-encrypted-outbox.js';
import {submissionPreflight} from '../runtime/service-preflight.js';
import {sha256} from '../workspace/brief-delivery.mjs';

async function setup(){
 const adapter=new FixtureProvider(),catalog=await adapter.catalog(),bytes=new Uint8Array(await exampleOriginal.arrayBuffer()),hash=await sha256(bytes);
 const brief={schema:'anima.brand-brief.v1',id:crypto.randomUUID(),createdAt:new Date().toISOString(),brand:{name:'Disposable'},answers:{feeling:'Quiet',people:'Artists',world:'Shared',signature:'Arriving'},foundations:[],references:[{id:'original',kind:'file',name:'Original <test>.png',type:'image/png',size:bytes.length,sha256:hash}]};
 const review=await prepareServiceReview({draftId:crypto.randomUUID(),brief,catalog,serviceId:catalog.services[0].id,endpoint:adapter.endpoint,values:{organization_name:'Disposable',brand_brief:'Example-only material'}});review.authorityBinding=adapter.access().binding;
 return {review,adapter,bytes,hash};
}
test('pre-consent summary shows the full canonical request digest, stable IDs and original without inventing ciphertext',async()=>{
 const {review,hash}=await setup(),full=await digest(review.request),before=structuredClone(review),html=submissionPreflight(review,full,null);
 for(const value of [full,review.request.request_id,review.request.idempotency_key,hash,review.catalog.intake.envelope.recipient_key_id])assert.ok(html.includes(value));
 assert.match(html,/Before Wallet consent/);assert.match(html,/appear after preparation/);assert.doesNotMatch(html,/Request encrypted envelope SHA-256/);assert.ok(!html.includes('Original <test>.png'));assert.deepEqual(review,before);
 assert.notEqual(full,review.request.brief.content_hash);
});
test('post-preparation summary exposes exact saved envelope digests and expiry, with no implicit send',async()=>{
 const {review,adapter,bytes}=await setup(),store=encryptedOutboxStore(true),before=structuredClone(review);
 const record=await prepareEncryptedOutbox(review,review.authorityBinding,adapter.encrypted,{manifest:review.request.references[0],bytes},store),html=submissionPreflight(review,await digest(review.request),record);
 for(const part of [record.bundle.request,record.bundle.reference]){assert.ok(html.includes(part.envelope_digest));assert.ok(html.includes(new Date(part.expires_at_ms).toISOString()));}
 assert.match(html,/Prepared bundle/);assert.match(html,/another Wallet approval/);assert.equal(record.request.state,'prepared');assert.equal(record.reference.state,'prepared');assert.equal(review.result,null);assert.deepEqual(review,before);
 assert.deepEqual((await store.load(review,review.authorityBinding)).bundle,record.bundle);
});
