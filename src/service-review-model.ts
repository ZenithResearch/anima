// Local review/cache models only. Wire contracts are owned by Service Management.
import {validateIntake,deriveDisplayState,ServiceClientError,type ProviderCatalog,type IntakeRequest,type IntakeResult,type ClientProjection,type JsonValue} from './vendor/service-client.js';
import {validateBrief,sha256,type BriefDocument} from '../workspace/brief-delivery.mjs';
export type SavedReview={version:1;draftId:string;sourceDigest:string;brief:BriefDocument;catalog:ProviderCatalog;endpoint:string;request:IntakeRequest;authorityBinding:string|null;attempt:'prepared'|'submitting'|'unknown'|'pending'|'admitted'|'rejected'|'failed';result:IntakeResult|null;projection:ClientProjection|null;checkedAt:string|null};
export function canonical(value:unknown):string{
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,v])=>JSON.stringify(key)+':'+canonical(v)).join(',')+'}';
 throw Error('The reviewed material contains an unsupported value.');
}
export const digest=(value:unknown)=>sha256(new TextEncoder().encode(canonical(value)));
export async function sourceDigest(brief:BriefDocument):Promise<string>{validateBrief(brief);const {id:_,createdAt:__,...content}=brief;return digest(content);}
export async function prepareServiceReview(input:{draftId:string;brief:BriefDocument;catalog:ProviderCatalog;serviceId:string;endpoint:string;values:Record<string,JsonValue>;previous?:SavedReview|null}):Promise<SavedReview>{
 validateBrief(input.brief);const service=input.catalog.services.find(s=>s.id===input.serviceId);if(!service)throw Error('Choose a published service.');
 // The complete, selected-only source is retained in values; the wire digest covers values.
 const values={...structuredClone(input.values),anima_brief:JSON.parse(JSON.stringify(input.brief)) as JsonValue};
 const source=await sourceDigest(input.brief),hash=await digest(values),old=input.previous;
 if(old&&old.sourceDigest===source&&old.endpoint===input.endpoint&&old.request.service.provider_id===input.catalog.provider.id&&old.request.service.service_id===service.id&&old.request.service.service_version===service.version){
  // Keep the original snapshot IDs/timestamps when the semantic source and answers match.
  const comparison={...values,anima_brief:old.request.brief.values.anima_brief!};
  if(await digest(comparison)===old.request.brief.content_hash)return structuredClone(old);
 }
 const request:IntakeRequest={schema:'service.intake.v1',request_id:'anima-'+crypto.randomUUID(),idempotency_key:'submit-'+crypto.randomUUID(),service:{provider_id:input.catalog.provider.id,service_id:service.id,service_version:service.version},brief:{schema:'service.reviewed-brief.v1',revision:1,content_hash:hash,values},references:input.brief.references.filter(r=>r.kind==='file').map(r=>({schema:'service.artifact-manifest.v1',artifact_id:'ref-'+r.sha256!.slice(0,48),content_hash:r.sha256!,byte_length:r.size!,media_type:r.type!,filename:r.name})),submitted_at:new Date().toISOString()};
 validateIntake(request,input.catalog);
 return {version:1,draftId:input.draftId,sourceDigest:source,brief:structuredClone(input.brief),catalog:structuredClone(input.catalog),endpoint:input.endpoint,request,authorityBinding:null,attempt:'prepared',result:null,projection:null,checkedAt:null};
}
export function assertResult(review:SavedReview,result:IntakeResult):void{
 if(result.request_id!==review.request.request_id||result.idempotency_key!==review.request.idempotency_key)throw Error('The provider acknowledgement belongs to another request.');
 if(result.state==='admitted'&&(!result.service_request_id||!result.service_request_version))throw Error('The provider has not supplied an admitted service request.');
 if(result.state==='pending'&&(result.service_request_id!==null||result.service_request_version!==null))throw Error('Pending transport cannot establish service admission.');
}
export function assertProjection(review:SavedReview,p:ClientProjection):void{
 if(p.request_id!==review.request.request_id||p.idempotency_key!==review.request.idempotency_key||p.provider_id!==review.request.service.provider_id||p.service_id!==review.request.service.service_id)throw Error('The provider returned another request’s status.');
 if(p.case&&(!p.service_request||p.service_request.case_id!==p.case.id))throw Error('The Case does not belong to the admitted request.');
 const old=review.projection;
 if(old&&((old.service_request&&!p.service_request)||(old.case&&!p.case)||(old.service_request&&p.service_request&&p.service_request.version<old.service_request.version)||(old.case&&p.case&&p.case.version<old.case.version)))throw Error('An older provider revision was returned. Last known work is retained.');
}
export function displayState(review:SavedReview):string{
 if(review.attempt==='unknown'||review.attempt==='submitting')return review.attempt==='submitting'?'Submitting':'Outcome unknown';
 if(review.projection){
  if(review.projection.execution&&review.projection.execution.freshness!=='current')return 'Status needs refreshing';
  if(review.projection.execution?.state==='unknown')return 'Unknown';
  if(review.projection.execution?.state==='blocked')return 'Action needed';
  const labels:Record<string,string>={'pending-provider':'Waiting for provider','qualification-needed':'Qualification needed',accepted:'Accepted',planned:'Planned',running:'In progress','review-needed':'Review needed',delivered:'Delivered',rejected:'Rejected',failed:'Failed',unknown:'Unknown'};
  return labels[deriveDisplayState(review.projection)]||'Unknown';
 }
 return ({prepared:'Ready to submit',pending:'Waiting for provider',admitted:'Accepted',rejected:'Rejected',failed:'Not submitted'} as Record<string,string>)[review.attempt]||'Unknown';
}
export function uncertain(error:unknown):boolean{return !(error instanceof ServiceClientError)||error.uncertain||error.code==='incompatible_response';}
export function safeProviderURL(value:string,base:string):string{
 const root=new URL(base),url=new URL(value,root);
 if(!['https:','http:'].includes(root.protocol)||root.username||root.password||url.origin!==root.origin||url.username||url.password||url.hash)throw Error('The provider returned an unsupported address.');
 if(root.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(root.hostname))throw Error('Use an HTTPS provider address.');
 return url.href;
}
