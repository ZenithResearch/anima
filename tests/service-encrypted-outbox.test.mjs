import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ServiceClient,parseProviderCatalog} from '../runtime/vendor/service-client.js';
import {prepareServiceReview,digest} from '../runtime/service-review-model.js';
import {encryptedOutboxStore,prepareEncryptedOutbox,sendEncryptedOutboxPart,validateEncryptedOutbox} from '../runtime/service-encrypted-outbox.js';
import {referenceProfileIssues,referenceProfileSummary} from '../runtime/service-reference-profile.js';
import {sha256} from '../workspace/brief-delivery.mjs';

async function setup(withReference=true){
 const catalog=parseProviderCatalog(JSON.parse(await readFile(new URL('../provider-contract/provider-catalog-v4.fixture.json',import.meta.url),'utf8'))),bytes=new Uint8Array([1,2,3]),contentHash=await sha256(bytes);
 const brief={schema:'anima.brand-brief.v1',id:crypto.randomUUID(),createdAt:new Date().toISOString(),brand:{name:'Example'},answers:{feeling:'Quiet',people:'Artists',world:'A calm world',signature:'Arriving',references:'Reference notes for this example'},foundations:[],references:withReference?[{id:'original',kind:'file',name:'Original.png',type:'image/png',size:bytes.length,sha256:contentHash}]:[]};
 const review=await prepareServiceReview({draftId:'e9491a43-cc9d-4d67-b389-cf4db027d99b',brief,catalog,serviceId:catalog.services[0].id,endpoint:'https://intake.zenith.invalid',values:{organization_name:'Example',brand_brief:'A reviewed brief'}});review.authorityBinding='example-member';
 const reference=withReference?{manifest:review.request.references[0],bytes}:null;
 const activity={evidence:0,seal:0,referenceSeal:0,evidenceCopies:[],calls:[],failRequest:false,failReference:false};
 const client=new ServiceClient({baseUrl:'https://intake.zenith.invalid',authorize:async()=>({}),fetch:async(url,init)=>{
  activity.calls.push({url:String(url),bytes:new Uint8Array(init.body).slice()});
  const isReference=String(url).endsWith('/reference-objects');
  if(isReference?activity.failReference:activity.failRequest)throw Error('Lost acknowledgement');
  const transport_receipt={transport:'example-only',receipt_id:'example-receipt',recorded_at:new Date().toISOString(),expires_at:null};
  return new Response(JSON.stringify(isReference?{schema:'service.reference-object-result.v1',request_id:review.request.request_id,idempotency_key:review.request.idempotency_key,artifact_id:reference.manifest.artifact_id,content_hash:contentHash,state:'pending',transport_receipt}:{schema:'service.intake-result.v1',request_id:review.request.request_id,idempotency_key:review.request.idempotency_key,state:'pending',transport_receipt,service_request_id:null,service_request_version:null,status_url:'/v1/client/requests/'+review.request.request_id}),{status:202});
 }});
 const port={prepare:(request,cat,ref)=>client.prepareEncryptedBundle(request,cat,ref,{authority:{evidence:async()=>{activity.evidence++;return new Uint8Array([8,7,6]);}},sealer:{seal:async input=>{activity.seal++;activity.evidenceCopies.push(input.requester_evidence.slice());return new Uint8Array([83,1,2]);}},referenceSealer:{sealReferenceObject:async input=>{activity.referenceSeal++;activity.evidenceCopies.push(input.requester_evidence.slice());return new Uint8Array([83,3,4]);}}}),sendRequest:p=>client.sendPreparedEncrypted(p,{authorize:async()=>({})}),sendReference:p=>client.sendPreparedEncryptedReference(p,{authorize:async()=>({})})};
 return {review,catalog,reference,activity,port,store:encryptedOutboxStore(true),binding:'example-member'};
}

test('catalog v4 enforces one PNG/JPEG original up to 512 KiB without changing selected material',async()=>{
 const {catalog,review}=await setup(),ref=review.request.references[0],service=catalog.services[0];
 assert.match(referenceProfileSummary(catalog,service),/512 KiB.*PNG, JPEG/);
 assert.match(referenceProfileSummary(catalog,{...service,accepted_references:[{...service.accepted_references[0],media_types:['application/pdf']}]}),/application\/pdf/);
 assert.deepEqual(referenceProfileIssues(catalog,service,[{...ref,byte_length:524288}]),[]);
 assert.match(referenceProfileIssues(catalog,service,[ref,{...ref,artifact_id:'second'}]).join(' '),/at most one/);
 assert.match(referenceProfileIssues(catalog,service,[{...ref,byte_length:524289}]).join(' '),/512 KiB/);
 assert.match(referenceProfileIssues(catalog,service,[{...ref,media_type:'application/pdf'}]).join(' '),/does not accept/);
 assert.equal(ref.byte_length,3);assert.equal(review.request.references.length,1);
});
test('one SDK bundle operation obtains evidence once and persists both exact prepared values before any send',async()=>{
 const {review,binding,port,reference,store,activity}=await setup();
 const result=await prepareEncryptedOutbox(review,binding,port,reference,store);
 assert.deepEqual([activity.evidence,activity.seal,activity.referenceSeal],[1,1,1]);assert.deepEqual(activity.evidenceCopies[0],activity.evidenceCopies[1]);assert.equal(activity.calls.length,0);
 assert.deepEqual((await store.load(review,binding)).bundle,result.bundle);
 const reopened=await prepareEncryptedOutbox(review,binding,port,reference,store);assert.deepEqual(reopened.bundle,result.bundle);assert.equal(activity.evidence,1);
});
test('zero-original bundle remains valid and never invokes reference sealing or creates a reference outcome',async()=>{
 const {review,binding,port,reference,store,activity}=await setup(false);const record=await prepareEncryptedOutbox(review,binding,port,reference,store);
 assert.equal(record.bundle.reference,null);assert.equal(record.reference,null);assert.deepEqual([activity.evidence,activity.referenceSeal],[1,0]);
 await assert.rejects(sendEncryptedOutboxPart(review,binding,'reference',port,store,()=>{}),/No reference/);
});
test('historical v4 retention snapshots remain readable without rewriting retained ciphertext',async()=>{
 for(const seconds of [86400,604800]){
  const {review,binding,port,reference,store}=await setup();review.catalog.intake.max_retention_seconds=seconds;review.catalog.reference_objects.max_retention_seconds=seconds;
  const original=await prepareEncryptedOutbox(review,binding,port,reference,store),restored=await store.load(review,binding);
  assert.equal(review.catalog.intake.max_retention_seconds,seconds);assert.deepEqual(restored.bundle,original.bundle);assert.equal(restored.bundle.request.expires_at_ms,original.bundle.request.expires_at_ms);
 }
});
test('unknown request retries exact ciphertext only; reference retention and admission remain separate',async()=>{
 const {review,binding,port,reference,store,activity}=await setup();await prepareEncryptedOutbox(review,binding,port,reference,store);
 await sendEncryptedOutboxPart(review,binding,'reference',port,store,()=>{});activity.failRequest=true;
 await assert.rejects(sendEncryptedOutboxPart(review,binding,'request',port,store,()=>{}),error=>error.uncertain===true);
 let record=await store.load(review,binding);assert.equal(record.reference.state,'retained');assert.equal(record.request.state,'unknown');assert.equal(review.result,null);assert.equal(review.projection,null);
 activity.failRequest=false;record=await sendEncryptedOutboxPart(review,binding,'request',port,store,()=>{});
 assert.equal(record.request.state,'retained');assert.equal(record.request.result.state,'pending');assert.equal(record.request.result.service_request_id,null);
 assert.equal(activity.calls.filter(c=>c.url.endsWith('/reference-objects')).length,1);assert.deepEqual(activity.calls[1].bytes,activity.calls[2].bytes);assert.equal(activity.evidence,1);assert.equal(activity.seal,1);
 await assert.rejects(sendEncryptedOutboxPart(review,binding,'reference',port,store,()=>{}),/already acknowledged/);
});
test('unknown reference retries independently without sending or resealing the request',async()=>{
 const {review,binding,port,reference,store,activity}=await setup();await prepareEncryptedOutbox(review,binding,port,reference,store);activity.failReference=true;
 await assert.rejects(sendEncryptedOutboxPart(review,binding,'reference',port,store,()=>{}));activity.failReference=false;
 await sendEncryptedOutboxPart(review,binding,'reference',port,store,()=>{});
 assert.equal(activity.calls.length,2);assert.ok(activity.calls.every(c=>c.url.endsWith('/reference-objects')));assert.deepEqual(activity.calls[0].bytes,activity.calls[1].bytes);assert.equal((await store.load(review,binding)).request.state,'prepared');assert.equal(activity.referenceSeal,1);
});
test('missing persistence, failed persistence or expired envelopes cannot reach a send or automatic replacement',async()=>{
 const {review,binding,port,reference,store,activity}=await setup();
 await assert.rejects(sendEncryptedOutboxPart(review,binding,'request',port,store,()=>{}),/Persist both/);
 await assert.rejects(prepareEncryptedOutbox(review,binding,port,reference,{load:async()=>null,save:async()=>{throw Error('Storage full');}}),/Storage full/);assert.equal(activity.calls.length,0);
 const record=await prepareEncryptedOutbox(review,binding,port,reference,store);
 await assert.rejects(sendEncryptedOutboxPart(review,binding,'request',port,store,()=>{},record.bundle.request.expires_at_ms),/Reconcile the same request/);assert.equal(activity.calls.length,0);
});
test('changed bundle, workspace binding, source request or concurrent revision fails without overwriting the outbox',async()=>{
 const {review,binding,port,reference,store}=await setup();const record=await prepareEncryptedOutbox(review,binding,port,reference,store);
 await assert.rejects(store.load(review,'another-member'),/does not match/);
 const corrupt=structuredClone(record);corrupt.bundle.reference.envelope[0]^=1;await assert.rejects(store.save(corrupt,review),/prepared reference/);
 const changed=structuredClone(review);changed.request.submitted_at=new Date(Date.now()+1000).toISOString();await assert.rejects(store.load(changed,binding),/does not match/);
 await store.save(record,review);await assert.rejects(store.save(record,review),/Another tab/);assert.deepEqual((await store.load(review,binding)).bundle,record.bundle);
});
test('interrupted sending reopens as unknown with the same identities and exact prepared bundle',async()=>{
 const {review,binding,port,reference,store}=await setup();let record=await prepareEncryptedOutbox(review,binding,port,reference,store);const bundle=structuredClone(record.bundle);
 record.request.state='sending';record=await store.save(record,review);const restored=await store.load(review,binding);
 assert.equal(restored.request.state,'unknown');assert.deepEqual(restored.bundle,bundle);assert.equal(restored.reviewHash,await digest(review.request));
 await validateEncryptedOutbox(restored,review,binding);
});
test('a retained acknowledgement cannot be downgraded to permit another transport send',async()=>{
 const {review,binding,port,reference,store}=await setup();await prepareEncryptedOutbox(review,binding,port,reference,store);
 const retained=await sendEncryptedOutboxPart(review,binding,'request',port,store,()=>{}),changed=structuredClone(retained);changed.request={state:'unknown',result:null};
 await assert.rejects(store.save(changed,review),/cannot be replaced or cleared/);assert.equal((await store.load(review,binding)).request.state,'retained');
});
