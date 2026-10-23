// Anima-local durable retry cache; canonical payload types stay producer-owned.
import {parseIntakeResult,parseReferenceObjectResult,encryptedIntakeAuthorization,encryptedReferenceAuthorization,type PreparedEncryptedBundle,type PreparedEncryptedSubmission,type PreparedEncryptedReference,type ProviderCatalogV4,type ArtifactManifest,type IntakeRequest,type IntakeResult,type ReferenceObjectResult} from './vendor/service-client.js';
import {canonical,digest,assertResult,uncertain,type SavedReview} from './service-review-model.js';
import {sha256} from '../workspace/brief-delivery.mjs';

export interface EncryptedBundlePort {
 prepare(request:IntakeRequest,catalog:ProviderCatalogV4,reference:{manifest:ArtifactManifest;bytes:Uint8Array}|null):Promise<PreparedEncryptedBundle>;
 sendRequest(prepared:PreparedEncryptedSubmission):Promise<IntakeResult>;
 sendReference(prepared:PreparedEncryptedReference):Promise<ReferenceObjectResult>;
}
type Attempt='prepared'|'sending'|'unknown'|'retained'|'failed';
export interface EncryptedOutbox {
 version:1;revision:number;draftId:string;reviewHash:string;binding:string;
 bundle:PreparedEncryptedBundle;
 request:{state:Attempt;result:IntakeResult|null};
 reference:{state:Attempt;result:ReferenceObjectResult|null}|null;
}
export interface EncryptedOutboxStore {
 load(review:SavedReview,binding:string):Promise<EncryptedOutbox|null>;
 save(record:EncryptedOutbox,review:SavedReview):Promise<EncryptedOutbox>;
}
const attempts=['prepared','sending','unknown','retained','failed'];
function matchingIdentity(review:SavedReview,p:PreparedEncryptedSubmission|PreparedEncryptedReference){
 if(p.request_id!==review.request.request_id||p.idempotency_key!==review.request.idempotency_key||p.provider_id!==review.request.service.provider_id)throw Error('The encrypted bundle belongs to another request.');
}
export async function validateEncryptedOutbox(value:EncryptedOutbox,review:SavedReview,binding:string):Promise<EncryptedOutbox>{
 const r=structuredClone(value),catalog=review.catalog;
 if(r.version!==1||!Number.isSafeInteger(r.revision)||r.revision<0||r.draftId!==review.draftId||!binding||r.binding!==binding||review.authorityBinding!==binding||r.reviewHash!==await digest(review.request)||catalog.schema!=='service.provider-catalog.v4')throw Error('The encrypted outbox does not match this reviewed workspace and connection.');
 const request=r.bundle.request;encryptedIntakeAuthorization(request);matchingIdentity(review,request);
 if(!(request.envelope instanceof Uint8Array)||request.envelope.byteLength<1||request.envelope.byteLength>328032||await sha256(new Uint8Array(request.envelope).buffer)!==request.envelope_digest||request.intake_digest!==r.reviewHash||request.endpoint!==new URL(catalog.intake.endpoint).href||request.recipient_key_id!==catalog.intake.envelope.recipient_key_id)throw Error('The prepared request bytes or provider profile changed.');
 const reference=r.bundle.reference;
 if((review.request.references.length===0)!==(reference===null)||review.request.references.length>1||(reference===null)!==(r.reference===null))throw Error('The prepared bundle is missing a reviewed reference.');
 if(reference){
  encryptedReferenceAuthorization(reference);matchingIdentity(review,reference);const manifest=review.request.references[0]!;
  if(!(reference.envelope instanceof Uint8Array)||reference.envelope.byteLength<1||reference.envelope.byteLength>787203||await sha256(new Uint8Array(reference.envelope).buffer)!==reference.envelope_digest||reference.artifact_id!==manifest.artifact_id||reference.content_hash!==manifest.content_hash||reference.endpoint!==new URL(catalog.reference_objects.endpoint).href||reference.recipient_key_id!==catalog.reference_objects.envelope.recipient_key_id)throw Error('The prepared reference bytes or provider profile changed.');
 }
 if(!r.request||!attempts.includes(r.request.state)||r.reference&&!attempts.includes(r.reference.state))throw Error('Unsupported encrypted transport state.');
 if(r.request.result){r.request.result=parseIntakeResult(r.request.result);assertResult(review,r.request.result);}
 if(r.reference?.result){const p=r.reference.result=parseReferenceObjectResult(r.reference.result);if(!reference||p.request_id!==request.request_id||p.idempotency_key!==request.idempotency_key||p.artifact_id!==reference.artifact_id||p.content_hash!==reference.content_hash)throw Error('The reference acknowledgement belongs to another original.');}
 if((r.request.state==='retained')!==Boolean(r.request.result)||r.reference&&((r.reference.state==='retained')!==Boolean(r.reference.result)))throw Error('Transport retention requires the matching acknowledgement.');
 return r;
}
function recovered(r:EncryptedOutbox):EncryptedOutbox{
 if(r.request.state==='sending')r.request.state='unknown';if(r.reference?.state==='sending')r.reference.state='unknown';return r;
}
function samePrepared(a:PreparedEncryptedSubmission|PreparedEncryptedReference|null,b:PreparedEncryptedSubmission|PreparedEncryptedReference|null):boolean{
 if(a===null||b===null)return a===b;
 const {envelope:left,...leftMeta}=a,{envelope:right,...rightMeta}=b;
 return left instanceof Uint8Array&&right instanceof Uint8Array&&left.byteLength===right.byteLength&&left.every((byte,index)=>byte===right[index])&&canonical(leftMeta)===canonical(rightMeta);
}
export function encryptedOutboxStore(memory=false,databaseName='anima-service-encrypted-outbox'):EncryptedOutboxStore{
 const cache=new Map<string,EncryptedOutbox>();let db:Promise<IDBDatabase>;
 const key=(r:SavedReview)=>r.draftId+':'+r.request.request_id;
 const open=()=>db??=new Promise((resolve,reject)=>{const request=indexedDB.open(databaseName,1);request.onupgradeneeded=()=>request.result.createObjectStore('bundles');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 function next(record:EncryptedOutbox,previous?:EncryptedOutbox):EncryptedOutbox{
  if(previous){
   if(previous.revision!==record.revision||previous.binding!==record.binding||previous.reviewHash!==record.reviewHash||!samePrepared(previous.bundle.request,record.bundle.request)||!samePrepared(previous.bundle.reference,record.bundle.reference))throw Error('Another tab changed this outbox. Reload; do not prepare a replacement.');
   for(const part of ['request','reference'] as const)if(previous[part]?.state==='retained'&&(record[part]?.state!=='retained'||canonical(previous[part]!.result)!==canonical(record[part]!.result)))throw Error('A retained transport acknowledgement cannot be replaced or cleared.');
  }
  else if(record.revision!==0)throw Error('The original outbox is missing. Nothing sent.');
  return structuredClone({...record,revision:record.revision+1});
 }
 return {
  async load(review,binding){let raw:EncryptedOutbox|undefined;
   if(memory)raw=cache.get(key(review));else {const database=await open();raw=await new Promise((resolve,reject)=>{const tx=database.transaction('bundles'),request=tx.objectStore('bundles').get(key(review));tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
   return raw?recovered(await validateEncryptedOutbox(raw,review,binding)):null;
  },
  async save(record,review){const valid=await validateEncryptedOutbox(record,review,record.binding);
   if(memory){const result=next(valid,cache.get(key(review)));cache.set(key(review),result);return structuredClone(result);}
   const database=await open();return new Promise((resolve,reject)=>{const tx=database.transaction('bundles','readwrite'),objects=tx.objectStore('bundles'),request=objects.get(key(review));let result:EncryptedOutbox,failure:unknown;
    request.onsuccess=()=>{try{result=next(valid,request.result);objects.put(result,key(review));}catch(error){failure=error;tx.abort();}};
    tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(failure||tx.error||Error('Encrypted outbox save interrupted. Nothing resent.'));
   });
  }
 };
}
export async function prepareEncryptedOutbox(review:SavedReview,binding:string,port:EncryptedBundlePort,reference:{manifest:ArtifactManifest;bytes:Uint8Array}|null,store:EncryptedOutboxStore):Promise<EncryptedOutbox>{
 const existing=await store.load(review,binding);if(existing)return existing;
 if(review.catalog.schema!=='service.provider-catalog.v4'||review.authorityBinding!==binding||!binding)throw Error('A catalog v4 service and the original authorized connection are required.');
 // Exactly one SDK bundle operation owns evidence/sealing. No sends exist here.
 const bundle=await port.prepare(structuredClone(review.request),structuredClone(review.catalog),reference);
 return store.save({version:1,revision:0,draftId:review.draftId,reviewHash:await digest(review.request),binding,bundle,request:{state:'prepared',result:null},reference:bundle.reference?{state:'prepared',result:null}:null},review);
}
export async function sendEncryptedOutboxPart(review:SavedReview,binding:string,part:'request'|'reference',port:EncryptedBundlePort,store:EncryptedOutboxStore,guard:()=>void,now=Date.now()):Promise<EncryptedOutbox>{
 guard();let record=await store.load(review,binding);if(!record)throw Error('Persist both prepared envelopes before sending.');
 const attempt=part==='request'?record.request:record.reference,prepared=part==='request'?record.bundle.request:record.bundle.reference;
 if(!attempt||!prepared)throw Error('No reference is selected for this request.');
 if(attempt.state==='retained')throw Error('This transport already acknowledged retention. Check authoritative request status.');
 if(now>=prepared.expires_at_ms)throw Error('The retained envelope expired. Reconcile the same request before any new preparation.');
 attempt.state='sending';record=await store.save(record,review);guard();
 // A crash after this point recovers as unknown. Only the chosen part is sent.
 try{
  if(part==='request'){const result=await port.sendRequest(structuredClone(record.bundle.request));assertResult(review,result);record.request={state:'retained',result};}
  else {const result=await port.sendReference(structuredClone(record.bundle.reference!));record.reference={state:'retained',result};}
  await validateEncryptedOutbox(record,review,binding);
 }catch(error){const current=part==='request'?record.request:record.reference!;current.result=null;current.state=uncertain(error)?'unknown':'failed';await store.save(record,review);throw error;}
 return store.save(record,review);
}
