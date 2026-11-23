import {ServiceClient,ServiceClientError} from './vendor/service-client.js';
import {unavailableAccess,type ProviderAdapter} from './service-adapter.js';
import {boundedProviderFetch} from './service-network.js';
import {sha256} from '../workspace/brief-delivery.mjs';

// Reviewed public deployment configuration, not a credential or shared schema.
// Discovery cannot replace these pins or configure a submission/projection route.
export const zenithPilotDiscovery=Object.freeze({
 origin:'http://127.0.0.1:4337',
 baseUrl:'https://zenith-provider-intake.vercel.app',
 catalogSha256:'80b67e2d0c19d334a6227b4a0b42640989d16b71fd66e1a58331e41f6d3cedde'
});
type DiscoveryPin=Readonly<{origin:string;baseUrl:string;catalogSha256:string}>;
const pending='Provider discovery only. This adapter cannot submit or read progress. Choose an explicitly supported Wallet approval surface to connect a locally configured transport test. Wallet consent does not itself submit a request.';
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
