import {ServiceClient,ServiceClientError,clientReadAuthorizationBytes,type AuthorizationRequest,type Authorize,type ProviderCatalog,type IntakeRequest,type IntakeResult,type ClientProjection,type ArtifactManifest,type ReceiptReference} from './vendor/service-client.js';
import {safeProviderURL} from './service-review-model.js';
import type {EncryptedBundlePort} from './service-encrypted-outbox.js';
import {boundedProviderFetch} from './service-network.js';
export type AccessState={identity:'unavailable'|'locked'|'ready';enrollment:'not_requested'|'pending'|'verified'|'unavailable';membership:'unavailable'|'verified';session:'unavailable'|'authenticated'|'expired';workspace:'unavailable'|'authorized'|'denied'|'expired';binding:string|null};
export const unavailableAccess=():AccessState=>({identity:'unavailable',enrollment:'unavailable',membership:'unavailable',session:'unavailable',workspace:'unavailable',binding:null});
export interface ProviderAdapter{
 readonly mode:'fixture'|'candidate'|'live';readonly endpoint:string;access():AccessState;
 readonly readOrigins?:readonly string[];
 readonly encrypted?:EncryptedBundlePort;
 catalog():Promise<ProviderCatalog>;upload(manifest:ArtifactManifest,bytes:Uint8Array):Promise<ArtifactManifest>;
 submit(request:IntakeRequest,catalog:ProviderCatalog):Promise<IntakeResult>;status(url:string,id:string):Promise<ClientProjection>;statusForRequest(id:string):Promise<ClientProjection>;
 artifact(href:string,hash:string):Promise<Uint8Array>;receipt(reference:ReceiptReference):Promise<unknown>;
}
// Local integration port, not a new credential or presentation format. The shared
// wallet adapter must approve these exact SDK-produced bytes for each GET.
export type AuthorizeProviderRead=(request:AuthorizationRequest,requestBytes:Uint8Array)=>Promise<Record<string,string>>;
// Hosted projection transport and released custody/sealing are not yet qualified.
// Fixture interaction never makes a real provider available.
export const providerActionsEnabled=(provider:ProviderAdapter|undefined):boolean=>provider?.mode==='fixture'||candidateProviders.has(provider!);
const candidateProviders=new WeakSet<ProviderAdapter>();
// Explicit local harness only. This allows an authorization ATTEMPT, never grants
// membership or access: the Wallet and receiver still approve or deny each call.
export function registerCandidateProvider(provider:ProviderAdapter,origin:string):void{
 const url=new URL(origin),endpoint=new URL(provider.endpoint);
 if(provider.mode!=='candidate'||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.origin!==origin||endpoint.protocol!=='http:'||endpoint.hostname!=='127.0.0.1')throw Error('Candidate rehearsal requires exact numeric loopback.');
 candidateProviders.add(provider);
}
// Explicit HTTPS acceptance only; the normal live entry remains unconfigured.
export function registerQueueCandidateProvider(provider:ProviderAdapter,origin:string):void{
 const caller=new URL(origin),endpoint=new URL(provider.endpoint);
 if(provider.mode!=='candidate'||caller.origin!==origin||caller.username||caller.password||!((caller.protocol==='http:'&&caller.hostname==='127.0.0.1')||caller.protocol==='https:')||endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw Error('Queue acceptance requires a reviewed HTTPS endpoint and exact browser origin.');
 candidateProviders.add(provider);
}
export function providerReadURL(provider:Pick<ProviderAdapter,'endpoint'|'readOrigins'>,value:string):string{
 const url=new URL(value,provider.endpoint+'/');
 if(!(provider.readOrigins??[new URL(provider.endpoint).origin]).includes(url.origin))throw Error('The provider returned an unsupported address.');
 return safeProviderURL(url.href,url.origin);
}
// Application composition must inject a qualified receiver-issued authorization port.
// No endpoint or credentials are accepted from a query parameter/browser storage.
export function liveProvider(options:{baseUrl:string;authorize:Authorize;authorizeRead?:AuthorizeProviderRead;trustedReadOrigins?:string[];responseBaseUrl?:string;access:()=>AccessState;fetch?:typeof fetch}):ProviderAdapter{
 const endpoint=safeProviderURL(options.baseUrl,options.baseUrl).replace(/\/$/,'');
 const readOrigins=Object.freeze([...new Set([new URL(endpoint).origin,...(options.trustedReadOrigins??[]).map(value=>{
  const url=new URL(value);safeProviderURL(url.href,url.href);
  if(url.pathname!=='/'||url.search||url.hash)throw Error('Configure a bare, reviewed read origin.');
  return url.origin;
 })])]);
 const readContext={endpoint,readOrigins};
 const network=options.fetch??globalThis.fetch.bind(globalThis);
 const client=new ServiceClient({baseUrl:endpoint,trustedReadOrigins:[...readOrigins],responseBaseUrl:options.responseBaseUrl,authorize:async request=>{
  if(request.method==='GET')providerReadURL(readContext,request.url);else safeProviderURL(request.url,endpoint);
  const state=options.access();
  if(!state.binding||state.workspace!=='authorized')throw new ServiceClientError('forbidden','Connect an authorized workspace before continuing.');
  if(request.method==='GET'){
   if(!options.authorizeRead)throw new ServiceClientError('unavailable','The shared Wallet read-authorization connection is not configured.');
   return options.authorizeRead(request,clientReadAuthorizationBytes(request));
  }
  return options.authorize(request);
 },fetch:boundedProviderFetch(network,(value,method)=>{
  if(method==='GET')providerReadURL(readContext,value);else safeProviderURL(value,endpoint);
 })});
 const unavailable=async():Promise<never>=>{throw new ServiceClientError('unavailable','Live delivery is not qualified. Encrypted preparation, durable ciphertext storage and the released wallet/sealer are required. Nothing sent.');};
 return {mode:'live',endpoint,readOrigins,access:options.access,catalog:()=>client.catalog(),upload:unavailable,submit:unavailable,status:async(u,id)=>{providerReadURL(readContext,u);return client.status(u,id);},statusForRequest:id=>client.statusForRequest(id),artifact:async(u,h)=>{providerReadURL(readContext,u);return client.artifact(u,h);},receipt:async r=>{providerReadURL(readContext,r.href);return client.receipt(r);}};
}
// Empty until a provider URL and real authorization/identity port are qualified.
export const configuredProviders:ProviderAdapter[]=[];
