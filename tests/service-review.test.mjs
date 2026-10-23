import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FixtureProvider,exampleBytes} from '../runtime/service-fixture.js';
import {prepareServiceReview,assertResult,assertProjection,displayState,canonical,digest,safeProviderURL,uncertain} from '../runtime/service-review-model.js';
import {parseSavedReview,reviewStore} from '../runtime/service-review-store.js';
import {liveProvider,unavailableAccess} from '../runtime/service-adapter.js';
import {sourceOverview,requestSummary,accessView} from '../runtime/service-review-view.js';
import {sha256} from '../workspace/brief-delivery.mjs';
const draft='dbb306a4-b8d6-4cbe-a706-e163d3849527';
function brief(){return {schema:'anima.brand-brief.v1',id:crypto.randomUUID(),createdAt:new Date().toISOString(),brand:{name:'An example practice'},answers:{feeling:'Quiet',people:'Artists',world:'An inhabited world',signature:'Coming into being'},foundations:[{id:'logo',notes:'Open shapes',referenceIds:['selected']}],references:[{id:'selected',name:'Chosen board',kind:'link',url:'https://www.pinterest.com/example/board/'}]};}
async function setup(previous,source=brief(),values={organization_name:'Example',brand_brief:'The reviewed brief'}){const adapter=new FixtureProvider(),catalog=await adapter.catalog();return {adapter,catalog,review:await prepareServiceReview({draftId:draft,brief:source,catalog,serviceId:catalog.services[0].id,endpoint:adapter.endpoint,values,previous})};}
test('review is immutable, hashes canonical values and reuses exact identities across refreshed source IDs',async()=>{
 const original=brief(),before=structuredClone(original),a=await setup(null,original);assert.deepEqual(original,before);
 const refreshed={...original,id:crypto.randomUUID(),createdAt:new Date(Date.now()+1000).toISOString()},b=await setup(a.review,refreshed);
 assert.deepEqual(b.review.request,a.review.request);assert.equal(a.review.request.brief.content_hash,await digest(a.review.request.brief.values));
 original.answers.feeling='Changed';assert.equal(a.review.brief.answers.feeling,'Quiet');assert.deepEqual(a.review.request.brief.values.anima_brief,before);
 const c=await setup(a.review,original);assert.notEqual(c.review.request.request_id,a.review.request.request_id);assert.notEqual(c.review.request.idempotency_key,a.review.request.idempotency_key);
});
test('a source change or changed provider requirement never silently drops references or truncates inputs',async()=>{
 const source=brief(),a=await setup(null,source);assert.equal(a.review.request.references.length,0);assert.equal(a.review.request.brief.values.anima_brief.references.length,1);
 await assert.rejects(setup(null,source,{brand_brief:'x'.repeat(12001)}),/too long/);
 const other=new FixtureProvider(true),catalog=await other.catalog();const b=await prepareServiceReview({draftId:draft,brief:source,catalog,endpoint:other.endpoint,serviceId:catalog.services[0].id,values:{brand_brief:'Example'},previous:a.review});assert.equal(b.request.service.provider_id,'example-studio');assert.notEqual(b.request.request_id,a.review.request.request_id);
});
test('pending transport cannot create service admission or a Case',async()=>{
 const {adapter,review}=await setup();const result=await adapter.submit(review.request,review.catalog);assertResult(review,result);assert.equal(result.state,'pending');assert.equal(result.service_request_id,null);
 const projection=await adapter.status(result.status_url,review.request.request_id);assertProjection(review,projection);assert.equal(projection.case,null);assert.equal(displayState({...review,attempt:'pending',result,projection}),'Waiting for provider');
 assert.throws(()=>assertResult(review,{...result,service_request_id:'invented'}),/Pending transport/);
 assert.throws(()=>assertResult(review,{...result,state:'admitted'}),/not supplied/);
});
test('unknown submission retains its complete request and can reconcile without resubmitting',async()=>{
 const {adapter,review}=await setup(),request=canonical(review.request);adapter.scenario='unknown';await assert.rejects(adapter.submit(review.request,review.catalog),error=>error.uncertain===true);assert.equal(canonical(review.request),request);
 review.attempt='unknown';assert.equal(displayState(review),'Outcome unknown');adapter.scenario='waiting';const p=await adapter.statusForRequest(review.request.request_id);assertProjection(review,p);assert.equal(p.service_request,null);
});
test('wrong request identity, Case binding and older canonical versions are rejected',async()=>{
 const {adapter,review}=await setup();await adapter.submit(review.request,review.catalog);adapter.scenario='delivered';const p=await adapter.status('',review.request.request_id);assertProjection(review,p);
 assert.throws(()=>assertProjection(review,{...p,request_id:'another'}),/another request/);
 assert.throws(()=>assertProjection(review,{...p,case:{...p.case,id:'unrelated'}}),/does not belong/);
 assert.throws(()=>assertProjection({...review,projection:p},{...p,service_request:{...p.service_request,version:1}}),/older provider/);
 assert.throws(()=>assertProjection({...review,projection:p},{...p,case:null,service_request:null,execution:null}),/older provider/);
});
test('unknown or stale execution and blocked work remain visible rather than optimistic delivery',async()=>{
 const {adapter,review}=await setup();await adapter.submit(review.request,review.catalog);adapter.scenario='delivered';const p=await adapter.status('',review.request.request_id);
 assert.equal(displayState({...review,projection:p}),'Delivered');assert.equal(displayState({...review,projection:{...p,execution:{...p.execution,state:'unknown'}}}),'Unknown');
 assert.equal(displayState({...review,projection:{...p,execution:{...p.execution,freshness:'stale'}}}),'Status needs refreshing');
 assert.equal(displayState({...review,projection:{...p,execution:{...p.execution,state:'blocked'}}}),'Action needed');
});
test('saved unknown outcomes survive reload and corrupt or unsupported snapshots do not overwrite work',async()=>{
 const {review}=await setup(),store=reviewStore(true);review.attempt='submitting';await store.save(review);const [restored]=await store.load(draft);assert.equal(restored.attempt,'unknown');assert.deepEqual(restored.request,review.request);
 await assert.rejects(parseSavedReview({...review,version:2}),/Unsupported/);const corrupt=structuredClone(review);corrupt.request.brief.values.brand_brief='Changed';await assert.rejects(store.save(corrupt),/changed/);assert.deepEqual((await store.load(draft))[0].request,review.request);
});
test('separate review store rejects mismatched mutations and never evicts unresolved records to enforce its bound',async()=>{
 const {review}=await setup(),store=reviewStore(true);await store.save(review);const changed=structuredClone(review);changed.request.submitted_at='2026-10-22T00:00:00Z';await assert.rejects(store.save(changed),/Another tab/);
 for(let i=1;i<20;i++){const next=structuredClone(review);next.request.request_id='request-'+i;await store.save(next);}
 const excess=structuredClone(review);excess.request.request_id='request-excess';await assert.rejects(store.save(excess),/20 saved/);assert.equal((await store.load(draft)).length,20);
});
test('provider-supplied text is escaped and local/membership/session authority are separate displays',async()=>{
 const {review}=await setup();review.catalog.provider.name='<img src=x onerror=alert(1)>';review.brief.answers.feeling='<script>bad()</script>';
 for(const html of [requestSummary(review),sourceOverview(review)]){assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));}
 const html=accessView({...unavailableAccess(),identity:'ready',enrollment:'pending'});assert.match(html,/Local identity/);assert.match(html,/pending/);assert.match(html,/unavailable/);
});
test('unconfigured or unauthorized providers never send; cross-origin descriptors cannot receive authority',async()=>{
 let grants=0,calls=0;const provider=liveProvider({baseUrl:'https://provider.example',access:unavailableAccess,authorize:async()=>{grants++;return {Authorization:'not-a-real-token'};},fetch:async()=>{calls++;throw Error('Unexpected network');}});
 await assert.rejects(provider.status('/v1/client/requests/example','example'),/authorized workspace/);assert.equal(calls,0);assert.equal(grants,0);
 await assert.rejects(provider.artifact('https://other.example/steal','a'.repeat(64)),/unsupported address/);assert.equal(grants,0);
 assert.throws(()=>safeProviderURL('javascript:alert(1)','https://provider.example'),/unsupported/);assert.throws(()=>safeProviderURL('https://name:secret@provider.example/file','https://provider.example'),/unsupported/);
 const active=liveProvider({baseUrl:'https://provider.example',access:()=>({...unavailableAccess(),workspace:'authorized',binding:'receiver-bound-context'}),authorize:async()=>({}),authorizeRead:async()=>({}),fetch:async(_input,init)=>{assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');throw Error('Expected network boundary');}});await assert.rejects(active.status('/v1/client/requests/example','example'),/Expected network/);
});
test('fixture artifact and receipt hashes are real, changed bytes fail, and no receipt signature is invented',async()=>{
 const {adapter,review}=await setup();await adapter.submit(review.request,review.catalog);adapter.scenario='delivered';const p=await adapter.status('',review.request.request_id),d=p.deliverables[0],receipt=p.receipts[0];assert.equal(d.artifact.content_hash,await sha256(exampleBytes));assert.equal(d.artifact.byte_length,exampleBytes.length);assert.equal(receipt.verification.state,'unverified');assert.equal((await adapter.receipt(receipt)).signature,null);
 adapter.scenario='corrupt-artifact';const changed=await adapter.artifact(d.href,d.artifact.content_hash);assert.notEqual(await sha256(changed),d.artifact.content_hash);
});

test('fixture account changes, locked identity, pending enrollment and expired authority never act as permission',async()=>{
 const {adapter,review}=await setup();
 for(const scenario of ['locked-identity','enrollment-pending','expired-session','expired-authority','denied']){adapter.scenario=scenario;await assert.rejects(adapter.submit(review.request,review.catalog),/authority/);}
 adapter.scenario='other-account';assert.notEqual(adapter.access().binding,'example-authority-a');
});
test('partial work remains in progress while the returned artifact is inspectable',async()=>{
 const {adapter,review}=await setup();await adapter.submit(review.request,review.catalog);adapter.scenario='partial-work';const projection=await adapter.status('',review.request.request_id);assertProjection(review,projection);assert.equal(displayState({...review,projection}),'In progress');assert.equal(projection.deliverables.length,1);
});
test('provider responses are bounded even without a Content-Length header',async()=>{
 let cancelled=false;const adapter=liveProvider({baseUrl:'https://provider.example',access:unavailableAccess,authorize:async()=>({}),fetch:async()=>new Response(new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(26*1024*1024));},cancel(){cancelled=true;}}))});
 await assert.rejects(adapter.catalog(),/25 MB/);assert.equal(cancelled,true);
});

test('legacy SDK unreadable acknowledgements remain uncertain without enabling live Anima delivery',async()=>{
 const {review}=await setup();const {ServiceClient}=await import('../runtime/vendor/service-client.js');const client=new ServiceClient({baseUrl:'https://provider.example',authorize:async()=>({}),fetch:async()=>new Response('{}',{headers:{'Content-Type':'application/json'}})});
 await assert.rejects(client.submit(review.request,review.catalog),error=>uncertain(error)===true);
});
