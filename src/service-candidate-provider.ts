// Isolated loopback acceptance, not production registration or an access grant.
import {ServiceClient,ServiceClientError,parseProviderCatalog,type ProviderCatalogV4} from './vendor/service-client.js';
import {type ProviderAdapter,unavailableAccess,registerCandidateProvider,registerQueueCandidateProvider} from './service-adapter.js';
import {serviceWalletAuthorization,walletEncryptedBundlePort,type ServiceWallet} from './service-wallet.js';
import {boundedProviderFetch} from './service-network.js';
import {candidateIntakeSealer,type BrowserSealerModule} from './service-sealer.js';
import {canonical,safeProviderURL} from './service-review-model.js';

// App-owned public test configuration. These are existing canonical catalog and
// membership identifiers, not a new identity/service contract or secret container.
export interface LocalCandidateProfile {origin:string;baseUrl:string;responseBaseUrl:string;member:{publicKey:string;membershipId:string};catalog:ProviderCatalogV4;}
function publicProfile(value:unknown):LocalCandidateProfile{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('The public candidate profile is missing.');
 const p=value as LocalCandidateProfile;
 if(Object.keys(p).sort().join(',')!=='baseUrl,catalog,member,origin,responseBaseUrl'||!p.member||Object.keys(p.member).sort().join(',')!=='membershipId,publicKey'||!/^[0-9a-f]{64}$/.test(p.member.publicKey)||!/^[0-9a-f]{64}$/.test(p.member.membershipId))throw Error('Use only the reviewed public candidate configuration.');
 const catalog=parseProviderCatalog(p.catalog);if(catalog.schema!=='service.provider-catalog.v4')throw Error('Candidate catalog v4 is required.');
 if(new URL(p.origin).origin!==p.origin)throw Error('Use the exact candidate page origin.');
 return structuredClone({...p,catalog});
}
const addresses=(p:LocalCandidateProfile)=>[p.baseUrl,p.responseBaseUrl,p.catalog.intake.endpoint,p.catalog.reference_objects.endpoint,p.catalog.requester.credential.endpoint];
export function parseLocalCandidateProfile(value:unknown):LocalCandidateProfile{
 const p=publicProfile(value);for(const address of [p.origin,...addresses(p)])numericLoopback(address);return p;
}
// App configuration only, not a transport/identity schema. No endpoints are
// learned from subsequent metadata. Existing loopback and saved reviews remain.
export function parseQueueCandidateProfile(value:unknown):LocalCandidateProfile{
 const p=publicProfile(value),caller=new URL(p.origin);
 if(caller.protocol!=='https:'&&!(caller.protocol==='http:'&&caller.hostname==='127.0.0.1'))throw Error('Use HTTPS or the exact numeric loopback caller.');
 for(const address of addresses(p))httpsAddress(address);
 if(p.catalog.intake.max_retention_seconds>604800||p.catalog.reference_objects.max_retention_seconds>604800)throw Error('The Queue candidate retention cannot exceed seven days.');
 if(!p.catalog.requester.credential.callers.some(c=>c.kind==='browser'&&c.id===p.origin))throw Error('The reviewed receiver profile does not permit this browser caller.');
 return p;
}
function numericLoopback(value:string):string{
 const address=new URL(safeProviderURL(value,value));if(address.protocol!=='http:'||address.hostname!=='127.0.0.1')throw Error('Only the reviewed numeric loopback candidate is supported here.');return address.origin;
}
function httpsAddress(value:string):string{
 const url=new URL(safeProviderURL(value,value));if(url.protocol!=='https:'||url.search)throw Error('Queue candidate operations require reviewed HTTPS addresses without query parameters.');return url.origin;
}
type CandidateInput={profile:LocalCandidateProfile;currentOrigin:()=>string;wallet:()=>ServiceWallet|undefined;loadSealer:()=>Promise<BrowserSealerModule>;fetch?:typeof fetch};
export const localCandidateProvider=(input:CandidateInput)=>composeCandidate(input,false);
export const queueCandidateProvider=(input:CandidateInput)=>composeCandidate(input,true);
function composeCandidate(input:CandidateInput,queue:boolean){
 const profile=(queue?parseQueueCandidateProfile:parseLocalCandidateProfile)(input.profile),addressOrigin=queue?httpsAddress:numericLoopback,readOrigins=Object.freeze([...new Set([addressOrigin(profile.baseUrl),addressOrigin(profile.responseBaseUrl)])]),origins=new Set([...readOrigins,...addresses(profile).map(addressOrigin)]);
 let connected=false;
 const guard=()=>{if(input.currentOrigin()!==profile.origin||!connected)throw new ServiceClientError('forbidden','Connect the disposable candidate Wallet first.');};
 const network=boundedProviderFetch(input.fetch??globalThis.fetch.bind(globalThis),(value)=>{if(!origins.has(addressOrigin(value)))throw new ServiceClientError('forbidden','The address is outside this reviewed candidate.');});
 // SDK 0.9.0 reserves responseBaseUrl for production HTTPS. The local harness
 // uses its supported status(absoluteURL,id) API with the published fixed route;
 // no vendor patch, fake HTTPS or fallback to the intake host is introduced.
 const client=new ServiceClient({baseUrl:profile.baseUrl,...(queue?{responseBaseUrl:profile.responseBaseUrl}:{}),trustedReadOrigins:[...readOrigins],trustedIntakeOrigins:[addressOrigin(profile.catalog.intake.endpoint),addressOrigin(profile.catalog.reference_objects.endpoint)],trustedCredentialOrigins:[addressOrigin(profile.catalog.requester.credential.endpoint)],fetch:network,authorize:request=>{guard();return authorization.authorizeRead(request);}});
 const statusForRequest=(id:string)=>{
  if(!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(id))throw Error('Invalid candidate request identity.');
  return queue?client.statusForRequest(id):client.status(profile.responseBaseUrl.replace(/\/$/,'')+'/v1/client/requests/'+encodeURIComponent(id),id);
 };
 const readURL=(url:string)=>new URL(url,profile.responseBaseUrl.replace(/\/$/,'')+'/').href;
 const authorization=serviceWalletAuthorization({wallet:input.wallet,client,requester:profile.catalog.requester,callerOrigin:profile.origin,currentOrigin:input.currentOrigin,member:profile.member,assertContext:guard,disclosure:operation=>({title:queue?'Anima Queue candidate':'Anima local candidate',statements:[queue?'Disposable HTTPS Queue acceptance; not a production request.':'Disposable loopback acceptance only; not a production request.','Operation: '+operation,'Review the exact material in Anima before approving.','Transport retention does not mean Service admission or completion.']})});
 const encrypted=walletEncryptedBundlePort(client,authorization,candidateIntakeSealer(input.loadSealer));
 const unavailable=async():Promise<never>=>{throw new ServiceClientError('forbidden','This candidate accepts only reviewed encrypted bundles.');};
 const provider:ProviderAdapter={mode:'candidate',endpoint:profile.baseUrl,readOrigins,encrypted,access:()=>({...unavailableAccess(),identity:connected?'ready':'unavailable',binding:connected?profile.member.publicKey+':'+profile.member.membershipId:null}),
  catalog:async()=>{const actual=await client.catalog();if(actual.schema!=='service.provider-catalog.v4'||actual.provider.id!==profile.catalog.provider.id||canonical(actual.requester)!==canonical(profile.catalog.requester)||canonical(actual.intake)!==canonical(profile.catalog.intake)||canonical(actual.reference_objects)!==canonical(profile.catalog.reference_objects))throw Error('The candidate provider pins changed. Review its configuration again.');return actual;},
  upload:unavailable,submit:unavailable,status:(_url,id)=>statusForRequest(id),statusForRequest,artifact:(url,hash)=>client.artifact(readURL(url),hash),receipt:reference=>client.receipt({...reference,href:readURL(reference.href)})};
 (queue?registerQueueCandidateProvider:registerCandidateProvider)(provider,profile.origin);
 return {provider,async connect(){
  connected=false;if(input.currentOrigin()!==profile.origin)throw Error('Open the exact local candidate page origin.');
  const wallet=input.wallet();if(!wallet||(await wallet.getStatus()).state!=='ready')throw Error('Install and unlock the disposable candidate Wallet.');
  if(!(await wallet.getCapabilities()).includes('credential_presentation_v2'))throw Error('Use the pinned credential-capable Wallet candidate.');
  const membership=await wallet.getMembership();
  if(membership.ownerPublicKey!==profile.member.publicKey||membership.membershipId!==profile.member.membershipId)throw Error('This Wallet is not the reviewed disposable test identity. No request was sent.');
  connected=true;
  // Presence only: do not declare membership, session or workspace rights verified.
 },disconnect(){connected=false;}};
}
