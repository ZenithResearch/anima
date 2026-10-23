import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {providerDiscovery,zenithPilotDiscovery} from '../runtime/service-discovery.js';
import {providerActionsEnabled} from '../runtime/service-adapter.js';
import {validateIntake} from '../runtime/vendor/service-client.js';
const bytes=await readFile(new URL('fixtures/public-zenith-pilot-catalog.json',import.meta.url));
function setup(){let origin=zenithPilotDiscovery.origin;const calls=[];const network=async(url,options)=>{calls.push({url,options});return new Response(bytes);};return {calls,setOrigin(value){origin=value;},options:{currentOrigin:()=>origin,fetch:network}};}
test('only exact reviewed origin can compose public discovery; other previews never fetch',()=>{
 for(const origin of ['http://127.0.0.1:4340','http://localhost:4337','https://anima.example']){
  const h=setup();h.setOrigin(origin);const result=providerDiscovery(h.options);assert.equal(result.provider,null);assert.match(result.detail,/not authorized/);assert.equal(h.calls.length,0);
 }
});
test('public release bytes parse through the unchanged canonical SDK without implying service availability or authority',async()=>{
 const h=setup(),{provider}=providerDiscovery(h.options),catalog=await provider.catalog();
 assert.equal(catalog.schema,'service.provider-catalog.v4');assert.equal(catalog.services[0].id,'zenith.anima.brand-package');assert.equal(catalog.services[0].availability,'preview');assert.equal(catalog.services[0].process,null);assert.deepEqual(catalog.services[0].communication,[]);
 assert.equal(catalog.requester.membership.roots[0].key_id,'zenith-membership-pilot-2026-10-22');
 assert.equal(catalog.requester.credential.policy_digest_sha256,'6b2ac2672b0c58452e24e5cd4568c312fff43efab5a1b6c801e842adcd066dad');
 assert.equal(providerActionsEnabled(provider),false);assert.equal(provider.access().membership,'unavailable');assert.equal(provider.access().binding,null);
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,zenithPilotDiscovery.baseUrl+'/v1/provider');assert.equal(h.calls[0].options.credentials,'omit');assert.equal(h.calls[0].options.redirect,'error');assert.equal(h.calls[0].options.mode,'cors');assert.equal(new Headers(h.calls[0].options.headers).has('Authorization'),false);
});
test('read-only adapter refuses every write and progress operation without network activity',async()=>{
 const h=setup(),{provider}=providerDiscovery(h.options);
 for(const operation of ['submit','upload','status','statusForRequest','artifact','receipt'])await assert.rejects(()=>provider[operation](),/discovery only/i);
 assert.equal(h.calls.length,0);
});
test('changed catalog, unavailable provider and changed caller fail closed without fallback',async()=>{
 const h=setup();await assert.rejects(()=>providerDiscovery({...h.options,fetch:async()=>new Response(bytes.toString()+' ')}).provider.catalog(),/differs/);
 await assert.rejects(()=>providerDiscovery({...h.options,fetch:async()=>new Response('',{status:503})}).provider.catalog(),/503/);
 const {provider}=providerDiscovery(h.options);h.setOrigin('http://127.0.0.1:4340');await assert.rejects(()=>provider.catalog(),/origin/);assert.equal(h.calls.length,0);
});

test('canonical SDK refuses the published preview service before any submission can be prepared',async()=>{
 const h=setup(),catalog=await providerDiscovery(h.options).provider.catalog(),service=catalog.services[0];
 const request={schema:'service.intake.v1',request_id:'example-request',idempotency_key:'example-key',service:{provider_id:catalog.provider.id,service_id:service.id,service_version:service.version},brief:{schema:'service.reviewed-brief.v1',revision:1,content_hash:'a'.repeat(64),values:{organization_name:'Example',brand_brief:'Example reviewed material'}},references:[],submitted_at:new Date().toISOString()};
 assert.throws(()=>validateIntake(request,catalog),/selected service version is unavailable/);
 assert.equal(h.calls.length,1);
});
