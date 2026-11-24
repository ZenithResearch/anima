import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateReviewedProviderConnection} from '../runtime/service-connection-config.js';
import {zenithPilotDiscovery} from '../runtime/service-discovery.js';
const profile=()=>({...zenithPilotDiscovery,responseBaseUrl:'https://responses.example/zenith/provider',testOnly:true});
test('private test configuration binds the exact public release without identity, authority or browser overrides',()=>{
 const p=profile(),before=structuredClone(p),parsed=validateReviewedProviderConnection(p);assert.deepEqual(parsed,before);assert.ok(Object.isFrozen(parsed));assert.deepEqual(p,before);
 assert.throws(()=>validateReviewedProviderConnection(p,'http://127.0.0.1:4340'));
 for(const change of [p=>p.testOnly=false,p=>p.origin='http://localhost:4337',p=>p.catalogSha256='a'.repeat(64),p=>p.baseUrl='https://other.example',p=>p.token='not-permitted',p=>p.member={},p=>delete p.responseBaseUrl]){const bad=profile();change(bad);assert.throws(()=>validateReviewedProviderConnection(bad));}
});
test('private response configuration cannot add credentials, parameters, path normalization or plaintext fallback',()=>{
 for(const value of ['http://responses.example/provider','https://name:secret@responses.example/provider','https://responses.example/provider/','https://responses.example/provider?token=bad','https://responses.example/provider#bad','https://responses.example/other/../provider','https://responses.example/%2e%2e/provider','https://responses.example/provider//child'])assert.throws(()=>validateReviewedProviderConnection({...profile(),responseBaseUrl:value}),value);
});
