import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serviceWalletAuthorization,walletEncryptedBundlePort} from '../runtime/service-wallet.js';
import {ServiceClient,parseProviderCatalog,clientReadAuthorizationBytes,encryptedIntakeAuthorizationBytes,encryptedReferenceAuthorizationBytes} from '../runtime/vendor/service-client.js';
import {canonical,digest} from '../runtime/service-review-model.js';
import {sha256} from '../workspace/brief-delivery.mjs';

// Callback fixtures only: placeholder signatures never count as Wallet custody,
// receiver cryptographic verification, live sending or membership acceptance.
const enc=new TextEncoder(),origin='http://127.0.0.1:4337';
async function setup(){
 const catalog=parseProviderCatalog(JSON.parse(await readFile(new URL('../provider-contract/provider-catalog-v4.fixture.json',import.meta.url),'utf8')));
 const requester=structuredClone(catalog.requester);requester.credential.callers=[{kind:'browser',id:origin}];
 const member={publicKey:'a'.repeat(64),membershipId:'b'.repeat(64)},root=requester.membership.roots[0];
 const membership={schema:'castalia.zenith-membership-credential.v3',version:3,membershipId:member.membershipId,ownerPublicKey:member.publicKey,status:'active',issuerId:root.issuer_id,issuerKeyId:root.key_id,signatureSuite:'Ed25519',issuerSignature:'A'.repeat(86)};
 const state={locked:false,deny:false,unavailable:false,wrongDigest:false,changed:false,origin,issueChange:null,approveChange:null,issued:[],approved:[],calls:[]};
 const wallet={getStatus:async()=>({state:state.locked?'locked':'ready'}),getMembership:async()=>({...membership,ownerPublicKey:state.changed?'c'.repeat(64):member.publicKey}),getCapabilities:async()=>['credential_presentation_v2'],presentCredential:async request=>{
  state.approved.push(structuredClone(request));state.approveChange?.();
  if(state.deny||state.unavailable)return {state:state.deny?'denied':'unavailable',reason:'example_only'};
  const c=request.credential.claims;
  return {state:'approved',presentation:{schema:'castalia.credential-presentation.v2',holder_public_key:c.holder_public_key,issuer:c.issuer,key_id:c.key_id,audience:c.audience,caller:c.caller,request_digest_sha256:c.request_digest_sha256,credential_digest_sha256:state.wrongDigest?'f'.repeat(64):await digest(request.credential),disclosure_digest_sha256:c.disclosure_digest_sha256,nonce:'1'.repeat(32),issued_at:c.issued_at,expires_at:c.issued_at+30,signature:'0'.repeat(128)}};
 }};
 let selected=wallet;
 const issuer={requestCredential:async(endpoint,request)=>{
  state.issued.push({endpoint,request:structuredClone(request)});state.issueChange?.();
  return {claims:{schema:'castalia.request-credential.v1',issuer:requester.credential.issuer,key_id:requester.credential.key_id,holder_public_key:request.membership.ownerPublicKey,audience:requester.credential.audience,caller:request.caller,request_digest_sha256:request.request_digest_sha256,disclosure_digest_sha256:request.disclosure_digest_sha256,policy_digest_sha256:requester.credential.policy_digest_sha256,nonce:request.nonce,issued_at:Math.floor(Date.now()/1000),expires_at:Math.floor(Date.now()/1000)+60},signature:'0'.repeat(128)};
 }};
 const options={wallet:()=>selected,client:issuer,requester,callerOrigin:origin,currentOrigin:()=>state.origin,member,assertContext:()=>{if(state.invalid)throw Error('Workspace authority expired');},disclosure:operation=>({title:'Example consent',statements:['Example-only '+operation]})};
 const auth=serviceWalletAuthorization(options),intake=enc.encode('{"schema":"example.only"}');
 const evidence={operation:'request.submit',method:'POST',body_digest:await sha256(intake),intake};
 const prepared={endpoint:catalog.intake.endpoint,envelope:new Uint8Array([1]),envelope_digest:await sha256(new Uint8Array([1])),intake_digest:await sha256(intake),provider_id:catalog.provider.id,request_id:'example-request',idempotency_key:'example-key',recipient_key_id:catalog.intake.envelope.recipient_key_id,expires_at_ms:Date.now()+120000};
 const reference={...prepared,endpoint:catalog.reference_objects.endpoint,artifact_id:'example-original',content_hash:'d'.repeat(64)};
 return {auth,options,state,catalog,member,prepared,reference,evidence,wallet,replaceWallet:()=>{selected={...wallet};}};
}
const decode=header=>JSON.parse(Buffer.from(header.Authorization.slice('Castalia '.length),'base64url').toString());
test('inner evidence contains the exact reviewed bytes and only canonical public proof fields',async()=>{
 const {auth,evidence,state}=await setup(),raw=await auth.evidence(evidence),proof=JSON.parse(new TextDecoder().decode(raw));
 assert.equal(proof.schema,'service.castalia-requester-evidence.v1');assert.deepEqual(Object.keys(proof).sort(),['membership','presentation','presentation_request','schema']);
 assert.deepEqual(Buffer.from(proof.presentation_request.request_bytes_base64,'base64'),Buffer.from(evidence.intake));
 assert.equal(new TextDecoder().decode(raw),canonical(proof));assert.equal(state.issued.length,1);assert.equal(state.approved.length,1);
 assert.equal(state.issued[0].request.request_digest_sha256,await sha256(evidence.intake));
});
test('request, reference and every GET bind distinct SDK bytes with fresh nonce and consent',async()=>{
 const {auth,prepared,reference,state}=await setup();
 const a=decode(await auth.authorizeRequest(prepared)),b=decode(await auth.authorizeReference(reference));
 const read={operation:'request.status',resource:'requests/example-request',method:'GET',body_digest:null,url:'https://read.example/v1/client/requests/example-request'};
 const c=decode(await auth.authorizeRead(read)),d=decode(await auth.authorizeRead(read));
 for(const proof of [a,b,c,d])assert.equal(proof.schema,'service.castalia-gateway-presentation.v1');
 for(const [proof,raw] of [[a,encryptedIntakeAuthorizationBytes(prepared)],[b,encryptedReferenceAuthorizationBytes(reference)],[c,clientReadAuthorizationBytes(read)]])assert.deepEqual(Buffer.from(proof.presentation_request.request_bytes_base64,'base64'),Buffer.from(raw));
 assert.equal(new Set(state.issued.map(x=>x.request.nonce)).size,4);assert.equal(state.approved.length,4);
 assert.notEqual(c.presentation_request.credential.claims.nonce,d.presentation_request.credential.claims.nonce);
});
test('locked Wallet, changed account, origin, or workspace stop before issuing credentials',async()=>{
 for(const change of [s=>s.locked=true,s=>s.changed=true,s=>s.origin='https://other.example',s=>s.invalid=true]){
  const {auth,state,evidence}=await setup();change(state);await assert.rejects(auth.evidence(evidence));assert.equal(state.issued.length,0);assert.equal(state.approved.length,0);
 }
});
test('account changes while issuing or approving cannot yield usable proof',async()=>{
 for(const phase of ['issueChange','approveChange']){const {auth,state,evidence}=await setup();state[phase]=()=>{state.changed=true;};await assert.rejects(auth.evidence(evidence),/active membership/);}
 const {auth,state,evidence,replaceWallet}=await setup();state.approveChange=replaceWallet;await assert.rejects(auth.evidence(evidence),/Wallet connection changed/);
});
test('denied and unavailable consent never yield evidence or authorization',async()=>{
 for(const flag of ['deny','unavailable']){const {auth,state,evidence,prepared}=await setup();state[flag]=true;await assert.rejects(auth.evidence(evidence),/No service submission/);await assert.rejects(auth.authorizeRequest(prepared),/No service submission/);}
});
test('receiver pins and returned credential binding cannot be replaced by discovery or a result',async()=>{
 const {auth,options,evidence}=await setup();options.requester.credential.issuer='different-catalog-issuer';await assert.rejects(auth.evidence(evidence),/reviewed trust/);
 const other=await setup();other.state.wrongDigest=true;await assert.rejects(other.auth.evidence(other.evidence),/another receiver credential/);
});
test('changed intake, stale credential and legacy read operation fail closed',async()=>{
 const {auth,evidence,options}=await setup();await assert.rejects(auth.evidence({...evidence,body_digest:'0'.repeat(64)}),/intake bytes changed/);
 assert.throws(()=>auth.authorizeRead({operation:'artifact.put',method:'POST',resource:'artifacts/example',body_digest:null}),/Unsupported client read/);
 const original=options.client.requestCredential;options.client.requestCredential=async(...args)=>{const value=await original(...args);value.claims.issued_at-=200;value.claims.expires_at-=200;return value;};
 await assert.rejects(auth.evidence(evidence),/invalid_validity/);
});
test('SDK port retries retained ciphertext with fresh outer consent and no repeated preparation',async()=>{
 const {auth,state,catalog,prepared}=await setup();let attempts=0;
 const client=new ServiceClient({baseUrl:new URL(catalog.intake.endpoint).origin,authorize:async()=>{throw Error('Unexpected plaintext authorization');},fetch:async(url,init)=>{
  state.calls.push({body:new Uint8Array(init.body),headers:init.headers});if(++attempts===1)throw Error('Lost acknowledgement');
  return new Response(JSON.stringify({schema:'service.intake-result.v1',request_id:prepared.request_id,idempotency_key:prepared.idempotency_key,state:'pending',transport_receipt:{transport:'example-only',receipt_id:'example',recorded_at:new Date().toISOString(),expires_at:null},service_request_id:null,service_request_version:null,status_url:'/v1/client/requests/'+prepared.request_id}),{status:202});
 }});
 const port=walletEncryptedBundlePort(client,auth,{seal:async()=>{throw Error('Must not reseal');},sealReferenceObject:async()=>{throw Error('Must not reseal');}});
 await assert.rejects(port.sendRequest(prepared),e=>e.uncertain===true);const result=await port.sendRequest(prepared);
 assert.equal(result.state,'pending');assert.deepEqual(state.calls[0].body,state.calls[1].body);assert.equal(state.approved.length,2);assert.notEqual(state.calls[0].headers.Authorization,state.calls[1].headers.Authorization);
});
test('Wallet contract helper and closed evidence schemas retain their exact producer provenance',async()=>{
 const root=new URL('../',import.meta.url),pin=JSON.parse(await readFile(new URL('WALLET-SOURCE.json',root),'utf8'));
 const local=await readFile(new URL(pin.wallet.local,root),'utf8');
 const upstreamHeader='// Vendored shared contract from bananawalnut/castalia-wallet-auth\n// Source: 7ab187d5c7d1de0d8058132021eb9ec726bfa0db src/presentation.ts (MIT). Keep synchronized with that review candidate.';
 const original=Buffer.from(local.replace(local.split('\n').slice(0,2).join('\n'),upstreamHeader).replace('bytes[bytes.length - 3]!','bytes[bytes.length - 3]').replace('bytes[bytes.length - 2]!','bytes[bytes.length - 2]'));
 assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${original.length}\0`),original])).digest('hex'),pin.wallet.gitBlob);
 for(const schema of pin.service.schemas){const content=await readFile(new URL('provider-contract/'+schema.path.split('/').at(-1),root));assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${content.length}\0`),content])).digest('hex'),schema.gitBlob);}
});
test('real SDK bundle composition shares one consent result across request and original sealers',async()=>{
 const {auth,state,catalog}=await setup(),original=new Uint8Array([1,2,3]),reference={manifest:{schema:'service.artifact-manifest.v1',artifact_id:'example-ref',content_hash:await sha256(original),byte_length:3,media_type:'image/png',filename:'Example.png'},bytes:original};
 const values={organization_name:'Example',brand_brief:'Example-only reviewed material'},request={schema:'service.intake.v1',request_id:'example-request',idempotency_key:'example-key',service:{provider_id:catalog.provider.id,service_id:catalog.services[0].id,service_version:catalog.services[0].version},brief:{schema:'service.reviewed-brief.v1',revision:1,content_hash:await digest(values),values},references:[reference.manifest],submitted_at:new Date().toISOString()};
 const observed=[],client=new ServiceClient({baseUrl:new URL(catalog.intake.endpoint).origin,authorize:async()=>{throw Error('Must not use plaintext authorization');},fetch:async()=>{throw Error('Preparation must not send');}});
 const port=walletEncryptedBundlePort(client,auth,{seal:async input=>{observed.push(input);return new Uint8Array([1]);},sealReferenceObject:async input=>{observed.push(input);return new Uint8Array([2]);}});
 const bundle=await port.prepare(request,catalog,reference);
 assert.equal(state.approved.length,1);assert.deepEqual(observed[0].requester_evidence,observed[1].requester_evidence);assert.equal(bundle.request.request_id,bundle.reference.request_id);assert.equal(bundle.reference.artifact_id,reference.manifest.artifact_id);
 const proof=JSON.parse(new TextDecoder().decode(observed[0].requester_evidence));assert.deepEqual(Buffer.from(proof.presentation_request.request_bytes_base64,'base64'),Buffer.from(canonical(request)));
});
