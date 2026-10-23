// Anima composition only: Wallet owns custody/consent; Service owns all wire formats.
import {ServiceClientError,clientReadAuthorizationBytes,encryptedIntakeAuthorizationBytes,encryptedReferenceAuthorizationBytes,type ServiceClient,type PublishedRequesterProfile,type ZenithMembershipCredentialV3,type RequesterEvidenceRequest,type PreparedEncryptedSubmission,type PreparedEncryptedReference,type AuthorizationRequest,type IntakeEnvelopeSealer,type ReferenceObjectEnvelopeSealer} from './vendor/service-client.js';
import {presentCredentialWithWallet,canonicalPresentationJson,type CredentialPresentationProvider,type PresentationDisclosure} from './vendor/wallet-credential-presentation.js';
import {safeProviderURL,canonical} from './service-review-model.js';
import {sha256} from '../workspace/brief-delivery.mjs';
import type {EncryptedBundlePort} from './service-encrypted-outbox.js';

// Narrow subset of the pinned window.castaliaWallet public surface. No signing
// keys, enrollment, generic challenges or authentication session are accepted.
export type ServiceWallet=CredentialPresentationProvider & {
 getStatus():Promise<{state:'locked'|'ready';publicIdentity?:string}>;
 getMembership():Promise<ZenithMembershipCredentialV3>;
};
export interface ServiceWalletOptions {
 wallet:()=>ServiceWallet|undefined;
 client:Pick<ServiceClient,'requestCredential'>;
 // Reviewed application configuration; never populated from catalog/storage/query.
 requester:PublishedRequesterProfile;
 callerOrigin:string;
 currentOrigin:()=>string;
 member:{publicKey:string;membershipId:string};
 assertContext:()=>void;
 disclosure:(operation:'brief'|'request.submit'|'reference.submit'|'request.status'|'artifact.get'|'receipt.get')=>PresentationDisclosure;
}
const encoder=new TextEncoder();
const bytes=(value:unknown)=>encoder.encode(canonical(value));
function base64(value:Uint8Array):string{
 let result='';for(let offset=0;offset<value.length;offset+=8192)result+=String.fromCharCode(...value.subarray(offset,offset+8192));return btoa(result);
}
function fail(message:string):never{throw new ServiceClientError('forbidden',message);}
function origin(value:string):string{
 const url=new URL(safeProviderURL(value,value));
 if(url.href!==url.origin+'/')throw new ServiceClientError('invalid_request','Configure an exact browser origin.');
 return url.origin;
}
export function serviceWalletAuthorization(options:ServiceWalletOptions){
 // Capture a detached trust snapshot. Discovery cannot replace receiver pins.
 const profile=structuredClone(options.requester),member=structuredClone(options.member),caller={kind:'browser' as const,id:origin(options.callerOrigin)};
 const endpoint=safeProviderURL(profile.credential.endpoint,profile.credential.endpoint);
 if(!/^[0-9a-f]{64}$/.test(member.publicKey)||!/^[0-9a-f]{64}$/.test(member.membershipId)||!profile.credential.callers.some(c=>c.kind===caller.kind&&c.id===caller.id))fail('The Wallet connection is not bound to this browser origin.');
 async function context(expectedWallet?:ServiceWallet):Promise<{wallet:ServiceWallet;membership:ZenithMembershipCredentialV3}>{
  options.assertContext();if(options.currentOrigin()!==caller.id)fail('The browser origin changed. Reconnect before continuing.');
  const wallet=options.wallet();if(!wallet||expectedWallet&&wallet!==expectedWallet)fail('The Wallet connection changed. Reconnect before continuing.');
  if((await wallet.getStatus()).state!=='ready')fail('Unlock the connected Wallet before continuing.');
  const membership=structuredClone(await wallet.getMembership());
  if(membership.schema!=='castalia.zenith-membership-credential.v3'||membership.version!==3||membership.status!=='active'||membership.ownerPublicKey!==member.publicKey||membership.membershipId!==member.membershipId||membership.signatureSuite!=='Ed25519'||!profile.membership.roots.some(r=>r.issuer_id===membership.issuerId&&r.key_id===membership.issuerKeyId))fail('An active membership for the connected identity is required.');
  options.assertContext();if(options.wallet()!==wallet||options.currentOrigin()!==caller.id)fail('The Wallet connection changed. Reconnect before continuing.');
  return {wallet,membership};
 }
 async function present(raw:Uint8Array,operation:Parameters<ServiceWalletOptions['disclosure']>[0]){
  const requestBytes=new Uint8Array(raw),disclosure=structuredClone(options.disclosure(operation));
  // Validate disclosure through the producer's canonical encoder before issuance.
  const requestDigest=await sha256(requestBytes),disclosureDigest=await sha256(encoder.encode(canonicalPresentationJson(disclosure)));
  const start=await context();
  if(!(await start.wallet.getCapabilities()).includes('credential_presentation_v2'))fail('This Wallet does not support Service consent.');
  const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  const credential=await options.client.requestCredential(endpoint,{schema:'service.castalia-credential-issuance.v1',membership:start.membership,request_digest_sha256:requestDigest,disclosure_digest_sha256:disclosureDigest,caller,nonce});
  const c=credential.claims,pin=profile.credential;
  if(c.issuer!==pin.issuer||c.key_id!==pin.key_id||c.audience!==pin.audience||c.policy_digest_sha256!==pin.policy_digest_sha256||c.holder_public_key!==member.publicKey||c.request_digest_sha256!==requestDigest||c.disclosure_digest_sha256!==disclosureDigest||c.nonce!==nonce||c.caller.kind!==caller.kind||c.caller.id!==caller.id)fail('The receiver credential does not match the reviewed trust configuration.');
  await context(start.wallet);
  const request={schema:'castalia.credential-presentation-request.v2' as const,request_bytes_base64:base64(requestBytes),disclosure,credential};
  // This shared helper validates shape/time/binding only. The Wallet verifies
  // issuer signatures against its own approved trust pins and owns key custody.
  const result=await presentCredentialWithWallet(start.wallet,request);
  if(result.state!=='approved')throw new ServiceClientError(result.state==='denied'?'consent_denied':'unavailable',result.state==='denied'?'Wallet approval was declined. No service submission was sent.':'Wallet approval is unavailable. No service submission was sent.');
  const end=await context(start.wallet);
  if(canonical(end.membership)!==canonical(start.membership))fail('Membership changed during approval. Reconnect before continuing.');
  if(result.presentation.credential_digest_sha256!==await sha256(encoder.encode(canonicalPresentationJson(credential))))fail('The Wallet presentation is bound to another receiver credential.');
  return {membership:start.membership,presentation_request:request,presentation:result.presentation};
 }
 async function gateway(raw:Uint8Array,operation:Exclude<Parameters<ServiceWalletOptions['disclosure']>[0],'brief'>){
  const {presentation_request,presentation}=await present(raw,operation);
  const value=bytes({schema:'service.castalia-gateway-presentation.v1',presentation_request,presentation});
  return {Authorization:'Castalia '+base64(value).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')};
 }
 return {
  // Structural membership data is never promoted into verified access here.
  async evidence(request:RequesterEvidenceRequest):Promise<Uint8Array>{
   if(request.operation!=='request.submit'||request.method!=='POST'||await sha256(new Uint8Array(request.intake))!==request.body_digest)fail('The reviewed intake bytes changed before consent.');
   const proof=await present(request.intake,'brief');
   return bytes({schema:'service.castalia-requester-evidence.v1',...proof});
  },
  authorizeRequest:(prepared:PreparedEncryptedSubmission)=>gateway(encryptedIntakeAuthorizationBytes(prepared),'request.submit'),
  authorizeReference:(prepared:PreparedEncryptedReference)=>gateway(encryptedReferenceAuthorizationBytes(prepared),'reference.submit'),
  authorizeRead:(request:AuthorizationRequest)=>gateway(clientReadAuthorizationBytes(request),request.operation as 'request.status'|'artifact.get'|'receipt.get'),
 };
}
export type ServiceWalletAuthorization=ReturnType<typeof serviceWalletAuthorization>;

// Integration factory only. It is deliberately not installed in configuredProviders.
// Existing outbox persists the complete bundle before either of these sends.
export function walletEncryptedBundlePort(client:ServiceClient,authorization:ServiceWalletAuthorization,sealer:IntakeEnvelopeSealer & ReferenceObjectEnvelopeSealer):EncryptedBundlePort{
 return {
  prepare:(request,catalog,reference)=>client.prepareEncryptedBundle(request,catalog,reference,{authority:{evidence:authorization.evidence},sealer,referenceSealer:sealer}),
  sendRequest:prepared=>client.sendPreparedEncrypted(prepared,{authorize:()=>authorization.authorizeRequest(prepared)}),
  sendReference:prepared=>client.sendPreparedEncryptedReference(prepared,{authorize:()=>authorization.authorizeReference(prepared)}),
 };
}
