import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {clientReadAuthorizationBytes,parseProviderCatalog,parseIntakeResult,parseClientProjection,validateIntake} from '../runtime/vendor/service-client.js';
import {liveProvider,unavailableAccess,configuredProviders,providerActionsEnabled,providerReadURL} from '../runtime/service-adapter.js';
import {FixtureProvider} from '../runtime/service-fixture.js';
const fixture=async name=>JSON.parse(await readFile(new URL('../provider-contract/'+name,import.meta.url),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const access=()=>({...unavailableAccess(),workspace:'authorized',binding:'test-receiver-bound-member'});
test('0.9.0 source is the pinned producer Git blob; copied contracts and fixtures match their recorded digests',async()=>{
 const root=new URL('../',import.meta.url),pin=JSON.parse(await readFile(new URL('PROVIDER-CLIENT-SOURCE.json',root),'utf8')),source=await readFile(new URL('src/vendor/service-client.ts',root));
 assert.equal(pin.version,'0.9.0');assert.equal(pin.producerCommit,'838520dd679394157ae21517d654cde2124b6b0c');assert.equal(hash(source),pin.sha256);
 assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${source.length}\0`),source])).digest('hex'),'128b8688979a96ae223a93374ee69008d30ca147');
 for(const [path,meta] of Object.entries(pin.sourceFiles))assert.equal(hash(await readFile(new URL(path,root))),meta.sha256,path);
});
test('frozen provider catalog v1/v2/v3 and retained response fixtures remain readable',async()=>{
 for(const file of ['provider-catalog.fixture.json','provider-catalog-v2.fixture.json','provider-catalog-v3.fixture.json'])assert.match(parseProviderCatalog(await fixture(file)).schema,/service.provider-catalog.v[123]/);
 const catalog=parseProviderCatalog(await fixture('provider-catalog-v3.fixture.json'));validateIntake(await fixture('intake-request.fixture.json'),catalog);
 assert.equal(parseIntakeResult(await fixture('intake-pending.fixture.json')).state,'pending');assert.equal(parseClientProjection(await fixture('request-delivered.fixture.json')).execution.state,'succeeded');
 assert.throws(()=>parseProviderCatalog({...catalog,schema:'service.provider-catalog.v5'}),/Unsupported/);
});
test('corrected v4 profile is seven days and the superseded24h catalog remains readable',async()=>{
 const current=parseProviderCatalog(await fixture('provider-catalog-v4.fixture.json'));
 const oldBytes=await readFile(new URL('../provider-contract/history/provider-catalog-v4.retention-604800.fixture.json',import.meta.url));
 const historical=parseProviderCatalog(JSON.parse(oldBytes));
 assert.equal(current.intake.max_retention_seconds,604800);assert.equal(current.reference_objects.max_retention_seconds,604800);
 assert.equal(historical.intake.max_retention_seconds,604800);assert.equal(historical.reference_objects.max_retention_seconds,604800);
 assert.equal(hash(oldBytes),'18037eccf81aefa978925cddc592c200e0c5e9154c8fbc3b781485a80f30da22');
 const supersededBytes=await readFile(new URL('../provider-contract/history/provider-catalog-v4.retention-86400.superseded.fixture.json',import.meta.url));
 const intermediate=parseProviderCatalog(JSON.parse(supersededBytes));assert.equal(intermediate.intake.max_retention_seconds,86400);assert.equal(intermediate.reference_objects.max_retention_seconds,86400);assert.equal(hash(supersededBytes),'75e0c6e18f75307f189566a09cf08e3ae834f4b2649e91684ab74d3512c23888');
});
test('status, artifact and receipt GETs each receive their own exact canonical Wallet request bytes',async()=>{
 const projection=await fixture('request-delivered.fixture.json'),artifact=new TextEncoder().encode('test returned bytes'),receipt=new TextEncoder().encode('{"schema":"test.receipt","signature":null}'),ref={...projection.receipts[0],content_hash:hash(receipt)},calls=[],grants=[];
 const provider=liveProvider({baseUrl:'https://provider.example',access,authorize:async()=>{throw Error('A read must not use command authorization');},authorizeRead:async(request,bytes)=>{
  const value=JSON.parse(new TextDecoder().decode(bytes));assert.deepEqual(value,{schema:'service.client-read-authorization.v1',operation:request.operation,resource:request.resource});assert.deepEqual(bytes,clientReadAuthorizationBytes(request));grants.push({request:{...request},bytes});return {Authorization:'Castalia test-fixture-'+grants.length};
 },fetch:async(url,init)=>{calls.push({url,init});assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');assert.equal(init.headers.Authorization,'Castalia test-fixture-'+grants.length);return new Response(String(url).includes('/receipts/')?receipt:String(url).includes('/artifacts/')?artifact:JSON.stringify(projection),{headers:{'Content-Type':'application/json'}});}});
 await provider.status('/v1/client/requests/'+projection.request_id,projection.request_id);await provider.artifact('/v1/client/artifacts/'+hash(artifact),hash(artifact));await provider.receipt(ref);await provider.status('/v1/client/requests/'+projection.request_id,projection.request_id);
 assert.deepEqual(grants.map(g=>g.request.operation),['request.status','artifact.get','receipt.get','request.status']);assert.equal(calls.length,4);assert.notEqual(grants[0].bytes.buffer,grants[3].bytes.buffer);
 assert.equal(grants[0].request.body_digest,null);assert.match(grants[2].request.resource,/receipts/);
});
test('read authorization cannot be substituted across operations, methods or resources',()=>{
 const base={operation:'request.status',resource:'requests/request-1',method:'GET',body_digest:null};
 for(const patch of [{method:'POST'},{body_digest:'a'.repeat(64)},{operation:'artifact.put'},{operation:'artifact.get'},{resource:'requests/\0bad'},{resource:'x'.repeat(4100)}])assert.throws(()=>clientReadAuthorizationBytes({...base,...patch}));
 const bytes=clientReadAuthorizationBytes(base);assert.equal(new TextDecoder().decode(bytes),'{"operation":"request.status","resource":"requests/request-1","schema":"service.client-read-authorization.v1"}');
});
test('missing Wallet read port and foreign origins do not fall back to a session or leak authorization',async()=>{
 let commands=0,reads=0,network=0;const options={baseUrl:'https://provider.example',access,authorize:async()=>{commands++;return {};},fetch:async()=>{network++;throw Error('Unexpected network');}};
 await assert.rejects(liveProvider(options).status('/v1/client/requests/request-1','request-1'),/Wallet read-authorization/);
 const provider=liveProvider({...options,authorizeRead:async()=>{reads++;return {};}});await assert.rejects(provider.status('https://other.example/steal','request-1'),/unsupported address/);
 assert.deepEqual([commands,reads,network],[0,0,0]);
});
test('Anima cannot use the legacy plaintext submission path or enable live actions from fixture metadata',async()=>{
 let network=0,authorization=0;const provider=liveProvider({baseUrl:'https://provider.example',access,authorize:async()=>{authorization++;return {};},fetch:async()=>{network++;throw Error('Unexpected network');}});
 const catalog=parseProviderCatalog(await fixture('provider-catalog-v3.fixture.json')),request=await fixture('intake-request.fixture.json');assert.equal(catalog.services[0].availability,'available');
 await assert.rejects(provider.submit(request,catalog),/Live delivery is not qualified/);await assert.rejects(provider.upload(request.references[0],new Uint8Array()),/Live delivery is not qualified/);
 assert.equal(providerActionsEnabled(provider),false);assert.equal(providerActionsEnabled(new FixtureProvider()),true);assert.deepEqual(configuredProviders,[]);assert.deepEqual([network,authorization],[0,0]);
});

test('explicit operator read origin supports independently authorized status, artifact and receipt GETs',async()=>{
 const projection=await fixture('request-delivered.fixture.json'),body=new TextEncoder().encode('returned bytes'),receipt=new TextEncoder().encode('{"signature":null}'),origin='https://responses.example',requests=[];
 const adapter=liveProvider({baseUrl:'https://intake.example',trustedReadOrigins:[origin],access,authorize:async()=>{throw Error('No command expected');},authorizeRead:async(r,bytes)=>{assert.equal(new URL(r.url).origin,origin);assert.deepEqual(bytes,clientReadAuthorizationBytes(r));requests.push(r.operation);return {Authorization:'Castalia test-fixture'};},fetch:async(url,init)=>{assert.equal(new URL(url).origin,origin);assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');return new Response(String(url).includes('/artifacts/')?body:String(url).includes('/receipts/')?receipt:JSON.stringify(projection));}});
 await adapter.status(origin+'/v1/client/requests/'+projection.request_id,projection.request_id);await adapter.artifact(origin+'/v1/client/artifacts/'+hash(body),hash(body));await adapter.receipt({...projection.receipts[0],href:origin+'/v1/client/receipts/example',content_hash:hash(receipt)});
 assert.deepEqual(requests,['request.status','artifact.get','receipt.get']);assert.equal(providerActionsEnabled(adapter),false);assert.equal(providerReadURL(adapter,origin+'/x'),origin+'/x');assert.throws(()=>adapter.readOrigins.push('https://unreviewed.example'));
});
test('discovered links cannot expand read trust and malformed configured origins are rejected',async()=>{
 let grants=0,network=0;const adapter=liveProvider({baseUrl:'https://intake.example',trustedReadOrigins:['https://responses.example'],access,authorize:async()=>({}),authorizeRead:async()=>{grants++;return {};},fetch:async()=>{network++;throw Error('Unexpected network');}});
 for(const href of ['https://unreviewed.example/steal','https://name:secret@responses.example/steal','https://responses.example/response#fragment','http://responses.example/steal'])await assert.rejects(adapter.status(href,'request-1'));
 for(const origin of ['https://name:secret@responses.example','https://responses.example/private','https://responses.example/?x=1','https://responses.example/#fragment','http://responses.example'])assert.throws(()=>liveProvider({baseUrl:'https://intake.example',trustedReadOrigins:[origin],access,authorize:async()=>({})}));
 assert.deepEqual([grants,network],[0,0]);
});

test('unknown intake outcomes reconcile by stable request ID at the explicitly configured mounted response base',async()=>{
 const projection=await fixture('request-delivered.fixture.json'),base='https://responses.example/zenith/provider',calls=[];let grants=0;
 const adapter=liveProvider({baseUrl:'https://intake.example',trustedReadOrigins:['https://responses.example'],responseBaseUrl:base,access,authorize:async()=>{throw Error('Unexpected command');},authorizeRead:async(r,bytes)=>{grants++;assert.equal(r.operation,'request.status');assert.equal(r.resource,'requests/'+projection.request_id);assert.deepEqual(bytes,clientReadAuthorizationBytes(r));return {Authorization:'Castalia example-only-'+grants};},fetch:async(url,init)=>{calls.push(String(url));assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');return new Response(JSON.stringify(projection));}});
 // No prior catalog response, intake acknowledgement, status_url or resubmission.
 await adapter.statusForRequest(projection.request_id);await adapter.statusForRequest(projection.request_id);
 assert.deepEqual(calls,[base+'/v1/client/requests/'+encodeURIComponent(projection.request_id),base+'/v1/client/requests/'+encodeURIComponent(projection.request_id)]);assert.equal(grants,2);assert.equal(providerActionsEnabled(adapter),false);
});
test('missing, untrusted or invalid response bases never disclose authority or silently fall back to intake',async()=>{
 let network=0,grants=0;const opts={baseUrl:'https://intake.example',trustedReadOrigins:['https://responses.example'],access,authorize:async()=>({}),authorizeRead:async()=>{grants++;return {};},fetch:async()=>{network++;throw Error('Unexpected network');}};
 await assert.rejects(liveProvider(opts).statusForRequest('stable-request'),/configured provider response base/);
 for(const responseBaseUrl of ['https://unreviewed.example/provider','http://responses.example/provider','https://responses.example/provider/','https://name:secret@responses.example/provider','https://responses.example/provider?key=bad','https://responses.example/provider#bad'])assert.throws(()=>liveProvider({...opts,responseBaseUrl}));
 await assert.rejects(liveProvider({...opts,responseBaseUrl:'https://responses.example/zenith/provider'}).statusForRequest('../replacement'));
 assert.deepEqual([network,grants],[0,0]);
});
