import {zenithPilotDiscovery} from './service-discovery.js';
// App build configuration only; never a credential, identity or service schema.
// An explicit private build option installs reviewed addresses. The public source
// stays disconnected, and browser storage/URL parameters cannot replace them.
export interface ReviewedProviderConnection {origin:string;baseUrl:string;responseBaseUrl:string;catalogSha256:string;testOnly:true;}
export const reviewedProviderConnection:ReviewedProviderConnection|null=null;
export function validateReviewedProviderConnection(value:unknown,currentOrigin:string=zenithPilotDiscovery.origin):ReviewedProviderConnection{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('A reviewed test connection is required.');
 const p=value as ReviewedProviderConnection,pin=zenithPilotDiscovery;
 if(Object.keys(p).sort().join(',')!=='baseUrl,catalogSha256,origin,responseBaseUrl,testOnly'||p.testOnly!==true||p.origin!==currentOrigin||p.origin!==pin.origin||p.baseUrl!==pin.baseUrl||p.catalogSha256!==pin.catalogSha256)throw Error('The test connection does not match the reviewed provider release.');
 if(typeof p.responseBaseUrl!=='string')throw Error('A separately reviewed response base is required.');
 const u=new URL(p.responseBaseUrl),segments=u.pathname==='/'?[]:u.pathname.slice(1).split('/');
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||p.responseBaseUrl.endsWith('/')||u.href.replace(/\/$/,'')!==p.responseBaseUrl||segments.some(s=>!s||!/^[A-Za-z0-9._~-]+$/.test(s)||s==='.'||s==='..'))throw Error('Use the exact reviewed HTTPS response base without credentials or parameters.');
 return Object.freeze({...p});
}
