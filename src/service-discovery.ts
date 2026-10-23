import {ServiceClient,ServiceClientError} from './vendor/service-client.js';
import {unavailableAccess,type ProviderAdapter} from './service-adapter.js';
import {boundedProviderFetch} from './service-network.js';
import {sha256} from '../workspace/brief-delivery.mjs';

// Reviewed public deployment configuration, not a credential or shared schema.
// Discovery cannot replace these pins or configure a submission/projection route.
export const zenithPilotDiscovery=Object.freeze({
 origin:'http://127.0.0.1:4337',
 baseUrl:'https://zenith-provider-intake.vercel.app',
 catalogSha256:'d65d9c5347ab6404fd8bdc30774563cd556a4d1f27534dd2f6bd518f5ef7ff2f'
});
type DiscoveryPin=Readonly<{origin:string;baseUrl:string;catalogSha256:string}>;
const pending='Provider discovery only. Encrypted submission requires the supported Wallet consent adapter and reviewed sealer. Provider progress has no configured projection address.';
export function providerDiscovery(options:{currentOrigin:()=>string;fetch?:typeof fetch;pin?:DiscoveryPin}):{provider:ProviderAdapter|null;detail:string}{
 const pin=options.pin??zenithPilotDiscovery;
 if(options.currentOrigin()!==pin.origin)return {provider:null,detail:`The Zenith pilot allows ${pin.origin}. This preview origin is not authorized; no provider connection is attempted. Your material stays local.`};
 const endpoint=new URL(pin.baseUrl);
 if(endpoint.protocol!=='https:'||endpoint.origin!==pin.baseUrl||!/^[0-9a-f]{64}$/.test(pin.catalogSha256))throw Error('Use a reviewed HTTPS discovery pin.');
 const catalogURL=pin.baseUrl+'/v1/provider';
 const assertOrigin=()=>{if(options.currentOrigin()!==pin.origin)throw new ServiceClientError('forbidden','The browser origin is outside this reviewed provider pilot.');};
 const bounded=boundedProviderFetch(options.fetch??globalThis.fetch.bind(globalThis),(url,method)=>{
  assertOrigin();if(url!==catalogURL||method!=='GET')throw new ServiceClientError('forbidden','Only the reviewed public catalog GET is connected.');
 });
 const client=new ServiceClient({baseUrl:pin.baseUrl,authorize:async()=>{throw new ServiceClientError('unavailable','No submission authorization is connected.');},fetch:async(input,init)=>{
  const response=await bounded(input,{...init,mode:'cors'});
  if(!response.ok)throw new ServiceClientError('unavailable','Provider discovery returned HTTP '+response.status+'. Your brief was not sent.');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length>1024*1024||await sha256(bytes)!==pin.catalogSha256)throw new ServiceClientError('incompatible_response','The provider catalog differs from the reviewed release. Review its deployment pins before continuing.');
  assertOrigin();return new Response(bytes.buffer,{status:response.status,headers:response.headers});
 }});
 const unavailable=async():Promise<never>=>{throw new ServiceClientError('unavailable',pending+' Nothing sent.');};
 const provider:ProviderAdapter={mode:'live',endpoint:pin.baseUrl,access:unavailableAccess,catalog:()=>client.catalog(),upload:unavailable,submit:unavailable,status:unavailable,statusForRequest:unavailable,artifact:unavailable,receipt:unavailable};
 return {provider,detail:pending};
}
