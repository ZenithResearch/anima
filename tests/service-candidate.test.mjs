import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {localCandidateProvider,parseLocalCandidateProfile,queueCandidateProvider,parseQueueCandidateProfile} from '../runtime/service-candidate-provider.js';
import {providerActionsEnabled,registerCandidateProvider,unavailableAccess} from '../runtime/service-adapter.js';
import {digest} from '../runtime/service-review-model.js';

async function setup(){
 const catalog=JSON.parse(await readFile(new URL('../provider-contract/provider-catalog-v4.fixture.json',import.meta.url),'utf8'));
 const origin='http://127.0.0.1:4337';catalog.intake.endpoint='http://127.0.0.1:8331/v1/client/intakes';catalog.reference_objects.endpoint='http://127.0.0.1:8331/v1/client/reference-objects';catalog.requester.credential.endpoint='http://127.0.0.1:8331/v1/client/credentials';catalog.requester.credential.callers=[{kind:'browser',id:origin}];
 const profile={origin,baseUrl:'http://127.0.0.1:8331',responseBaseUrl:'http://127.0.0.1:8332',member:{publicKey:'a'.repeat(64),membershipId:'b'.repeat(64)},catalog};
 const state={wrongMember:false,locked:false,origin,calls:[]};
 const wallet={getStatus:async()=>({state:state.locked?'locked':'ready'}),getCapabilities:async()=>['credential_presentation_v2'],getMembership:async()=>({ownerPublicKey:state.wrongMember?'c'.repeat(64):profile.member.publicKey,membershipId:profile.member.membershipId}),presentCredential:async()=>{throw Error('No real Wallet consent in this test');}};
 const connection=localCandidateProvider({profile,wallet:()=>wallet,currentOrigin:()=>state.origin,loadSealer:async()=>{throw Error('No sealer activation from presence');},fetch:async(url,init)=>{state.calls.push({url,init});return new Response(JSON.stringify(catalog));}});
 return {profile,state,connection,catalog};
}
test('candidate requires exact numeric loopback and a closed public configuration',async()=>{
 const {profile}=await setup();assert.equal(parseLocalCandidateProfile(profile).origin,profile.origin);
 for(const address of ['https://provider.example','http://localhost:4337','http://127.0.0.1:4337/path','http://127.0.0.1:4337?key=x'])assert.throws(()=>parseLocalCandidateProfile({...profile,origin:address}));
 assert.throws(()=>parseLocalCandidateProfile({...profile,token:'No secrets belong here'}));
 assert.throws(()=>parseLocalCandidateProfile({...profile,catalog:{...profile.catalog,intake:{...profile.catalog.intake,endpoint:'http://192.168.1.2:8291'}}}));
 assert.throws(()=>registerCandidateProvider({mode:'live',endpoint:profile.baseUrl},profile.origin));
});
test('Wallet presence never declares verified membership, session or workspace authority',async()=>{
 const {connection,state}=await setup();assert.deepEqual(connection.provider.access(),unavailableAccess());
 await connection.connect();const access=connection.provider.access();assert.equal(access.identity,'ready');assert.ok(access.binding);assert.equal(access.membership,'unavailable');assert.equal(access.session,'unavailable');assert.equal(access.workspace,'unavailable');assert.equal(state.calls.length,0);
 assert.equal(providerActionsEnabled(connection.provider),true);connection.disconnect();assert.equal(connection.provider.access().binding,null);
});
test('wrong member, locked Wallet and changed origin cannot connect or send',async()=>{
 for(const change of [s=>s.wrongMember=true,s=>s.locked=true,s=>s.origin='http://127.0.0.1:4999']){const {connection,state}=await setup();change(state);await assert.rejects(connection.connect());assert.equal(connection.provider.access().binding,null);assert.equal(state.calls.length,0);}
});
test('candidate catalog cannot replace reviewed requester pins, and plaintext paths stay closed',async()=>{
 const {connection,catalog,state}=await setup();assert.equal((await connection.provider.catalog()).schema,'service.provider-catalog.v4');
 catalog.requester.credential.issuer='changed-issuer';await assert.rejects(connection.provider.catalog(),/pins changed/);
 assert.equal(state.calls[0].init.credentials,'omit');assert.equal(state.calls[0].init.redirect,'error');
 await assert.rejects(connection.provider.submit({},catalog),/only reviewed encrypted/);await assert.rejects(connection.provider.upload({},new Uint8Array([1])),/only reviewed encrypted/);assert.equal(state.calls.length,2);
});

// Public callback fixtures, not a live Queue, issuer or cryptographic Wallet test.
async function queueSetup(){
 const {profile}=await setup();profile.baseUrl='https://queue.example';profile.responseBaseUrl='https://read.example/provider';
 profile.catalog.intake.endpoint='https://queue.example/v1/client/requests';profile.catalog.reference_objects.endpoint='https://originals.example/v1/client/reference-objects';profile.catalog.requester.credential.endpoint='https://issuer.example/v1/request-credential';
 profile.catalog.intake.max_retention_seconds=604800;profile.catalog.reference_objects.max_retention_seconds=604800;
 const pin=profile.catalog.requester.credential,root=profile.catalog.requester.membership.roots[0];
 const membership={schema:'castalia.zenith-membership-credential.v3',version:3,membershipId:profile.member.membershipId,ownerPublicKey:profile.member.publicKey,status:'active',issuerId:root.issuer_id,issuerKeyId:root.key_id,signatureSuite:'Ed25519',issuerSignature:'A'.repeat(86)};
 const state={calls:[],approvals:0,locked:false,origin:profile.origin};
 const wallet={getStatus:async()=>({state:state.locked?'locked':'ready'}),getCapabilities:async()=>['credential_presentation_v2'],getMembership:async()=>membership,presentCredential:async request=>{
  state.approvals++;const c=request.credential.claims;
  return {state:'approved',presentation:{schema:'castalia.credential-presentation.v2',holder_public_key:c.holder_public_key,issuer:c.issuer,key_id:c.key_id,audience:c.audience,caller:c.caller,request_digest_sha256:c.request_digest_sha256,credential_digest_sha256:await digest(request.credential),disclosure_digest_sha256:c.disclosure_digest_sha256,nonce:'1'.repeat(32),issued_at:c.issued_at,expires_at:c.issued_at+30,signature:'0'.repeat(128)}};
 }};
 const projection=JSON.parse(await readFile(new URL('../provider-contract/request-delivered.fixture.json',import.meta.url),'utf8'));
 const connection=queueCandidateProvider({profile,currentOrigin:()=>state.origin,wallet:()=>wallet,loadSealer:async()=>{throw Error('Presence and reads must not load the sealer.');},fetch:async(url,init)=>{
  state.calls.push({url:String(url),init});
  if(String(url).endsWith('/v1/provider'))return new Response(JSON.stringify(profile.catalog));
  if(String(url)===pin.endpoint){const request=JSON.parse(new TextDecoder().decode(init.body));return new Response(JSON.stringify({claims:{schema:'castalia.request-credential.v1',issuer:pin.issuer,key_id:pin.key_id,holder_public_key:membership.ownerPublicKey,audience:pin.audience,caller:request.caller,request_digest_sha256:request.request_digest_sha256,disclosure_digest_sha256:request.disclosure_digest_sha256,policy_digest_sha256:pin.policy_digest_sha256,nonce:request.nonce,issued_at:Math.floor(Date.now()/1000),expires_at:Math.floor(Date.now()/1000)+60},signature:'0'.repeat(128)}));}
  return new Response(JSON.stringify(projection));
 }});
 return {profile,state,connection};
}
test('HTTPS Queue examples use corrected seven-day source profile while historical configuration decoding stays compatible',async()=>{
 const {profile}=await queueSetup();assert.equal(parseQueueCandidateProfile(profile).responseBaseUrl,profile.responseBaseUrl);assert.throws(()=>parseLocalCandidateProfile(profile),/numeric loopback/);
 assert.equal(profile.catalog.intake.max_retention_seconds,604800);assert.equal(profile.catalog.reference_objects.max_retention_seconds,604800);
 for(const seconds of [86400,86401,604799,604800]){const compatible=structuredClone(profile);compatible.catalog.intake.max_retention_seconds=seconds;compatible.catalog.reference_objects.max_retention_seconds=seconds;assert.equal(parseQueueCandidateProfile(compatible).catalog.intake.max_retention_seconds,seconds);}
 for(const mutate of [p=>p.responseBaseUrl='http://127.0.0.1:8291',p=>p.catalog.reference_objects.endpoint='http://other.example',p=>p.catalog.intake.max_retention_seconds=604801,p=>p.catalog.reference_objects.max_retention_seconds=604801,p=>p.catalog.requester.credential.callers=[],p=>p.secret='No secrets',p=>p.catalog.intake.endpoint='https://name:secret@queue.example/steal']){const bad=structuredClone(profile);mutate(bad);assert.throws(()=>parseQueueCandidateProfile(bad));}
});
test('Queue candidate presence does not grant authority, and foreign descriptors fail before consent/network',async()=>{
 const {connection,state}=await queueSetup();await connection.connect();const access=connection.provider.access();assert.equal(access.membership,'unavailable');assert.equal(access.workspace,'unavailable');assert.equal(state.calls.length,0);assert.equal(state.approvals,0);
 await assert.rejects(connection.provider.artifact('https://foreign.example/steal','a'.repeat(64)));assert.equal(state.calls.length,0);assert.equal(state.approvals,0);
 await assert.rejects(connection.provider.submit({},{}),/only reviewed encrypted/);
 connection.disconnect();await assert.rejects(connection.provider.statusForRequest('example-request'),/Connect/);assert.equal(state.calls.length,0);
});
test('Queue reconciliation uses the pinned response mount even when acknowledgement points at intake',async()=>{
 const {connection,state,profile}=await queueSetup();await connection.connect();
 await connection.provider.status('https://queue.example/untrusted-receipt-route','example-request');
 await connection.provider.statusForRequest('example-request');
 const reads=state.calls.filter(c=>c.init.method!=='POST');assert.equal(reads.length,2);
 assert.ok(reads.every(c=>c.url===profile.responseBaseUrl+'/v1/client/requests/example-request'&&c.init.credentials==='omit'&&c.init.redirect==='error'));
 assert.equal(state.calls.filter(c=>c.url===profile.catalog.requester.credential.endpoint).length,2);assert.equal(state.approvals,2);
 assert.notEqual(reads[0].init.headers.Authorization,reads[1].init.headers.Authorization);
 state.locked=true;await assert.rejects(connection.provider.statusForRequest('example-request'),/Unlock/);assert.equal(state.calls.length,4);
});
