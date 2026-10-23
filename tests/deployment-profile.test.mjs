import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectDeploymentProfile,probeDeploymentCatalog} from '../check-provider-profile.mjs';

async function example(){
 const origin='http://127.0.0.1:4337',catalog=JSON.parse(await readFile(new URL('../provider-contract/provider-catalog-v4.fixture.json',import.meta.url),'utf8'));
 catalog.requester.credential.callers=[{kind:'browser',id:origin}];
 return {origin,baseUrl:'https://intake.zenith.invalid',responseBaseUrl:'https://read.zenith.invalid',member:{publicKey:'a'.repeat(64),membershipId:'b'.repeat(64)},catalog};
}
test('deployment preflight identifies only reviewed public configuration, never live authority',async()=>{
 const raw=await example(),before=structuredClone(raw),a=inspectDeploymentProfile(raw),b=inspectDeploymentProfile(raw);
 assert.equal(a.report.state,'configuration-valid-only');assert.equal(a.report.profileSha256,b.report.profileSha256);assert.equal(a.report.transports.length,2);assert.equal(a.report.transports[0].retentionSeconds,604800);assert.equal(a.report.transports[1].retentionSeconds,604800);assert.equal(a.report.notVerified.length,4);assert.deepEqual(raw,before);
});
test('wrong caller, expired or future recipient keys and unsupported retention fail preflight',async()=>{
 const good=await example();
 for(const mutate of [p=>p.origin='https://another.example',p=>p.catalog.intake.envelope.not_after='2026-10-01T00:00:00.000Z',p=>p.catalog.reference_objects.envelope.not_before='2026-12-30T00:00:00.000Z',p=>p.catalog.intake.max_retention_seconds=59]){const bad=structuredClone(good);mutate(bad);assert.throws(()=>inspectDeploymentProfile(bad));}
});
test('catalog probe cannot submit, follow redirects, trust changed metadata or accept wildcard CORS',async()=>{
 const profile=await example(),calls=[];
 const network=async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify(profile.catalog),{headers:{'access-control-allow-origin':profile.origin}});};
 assert.equal((await probeDeploymentCatalog(profile,network)).state,'catalog-matches-reviewed-profile');assert.equal(calls.length,1);assert.equal(calls[0].init.method,'GET');assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].init.credentials,'omit');
 await assert.rejects(probeDeploymentCatalog(profile,async()=>new Response(JSON.stringify(profile.catalog),{headers:{'access-control-allow-origin':'*'}})),/explicitly allow/);
 const changed=structuredClone(profile.catalog);changed.intake.envelope.recipient_key_id='changed-key';changed.reference_objects.envelope.recipient_key_id='changed-key';await assert.rejects(probeDeploymentCatalog(profile,async()=>new Response(JSON.stringify(changed),{headers:{'access-control-allow-origin':profile.origin}})),/differs/);
});
