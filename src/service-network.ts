import {ServiceClientError} from './vendor/service-client.js';
// Shared transport ceiling; the caller owns the fixed URL/origin policy.
export function boundedProviderFetch(network:typeof fetch,validate:(url:string,method:string)=>void):typeof fetch{
 return async(input,init)=>{
  const value=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  validate(value,(init?.method||'GET').toUpperCase());
  const controller=new AbortController(),deadline=globalThis.setTimeout(()=>controller.abort(),30000);
  try{
   const response=await network(input,{...init,signal:controller.signal,redirect:'error',credentials:'omit'});
   const limit=25*1024*1024,declared=Number(response.headers.get('Content-Length'));
   if(declared>limit){await response.body?.cancel();throw new ServiceClientError('response_too_large','The provider response exceeds the 25 MB browser limit.');}
   if(!response.body)return response;
   const reader=response.body.getReader(),chunks:Uint8Array[]=[];let total=0;
   for(;;){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>limit){await reader.cancel();throw new ServiceClientError('response_too_large','The provider response exceeds the 25 MB browser limit.');}chunks.push(part.value);}
   const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   return new Response(bytes.buffer,{status:response.status,statusText:response.statusText,headers:response.headers});
  }finally{globalThis.clearTimeout(deadline);}
 };
}
