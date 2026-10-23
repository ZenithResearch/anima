import {parseProviderCatalog,parseIntakeResult,parseClientProjection,validateIntake} from './vendor/service-client.js';
import {validateBrief} from '../workspace/brief-delivery.mjs';
import {assertResult,assertProjection,digest,sourceDigest,canonical,safeProviderURL,type SavedReview} from './service-review-model.js';
const attempts=['prepared','submitting','unknown','pending','admitted','rejected','failed'];
export async function parseSavedReview(value:unknown):Promise<SavedReview>{
 if(!value||typeof value!=='object')throw Error('Unsupported saved request.');
 const r=structuredClone(value) as SavedReview;
 if(r.version!==1||typeof r.draftId!=='string'||typeof r.endpoint!=='string'||typeof r.sourceDigest!=='string'||!attempts.includes(r.attempt)||!r.request||r.request.schema!=='service.intake.v1'||(r.authorityBinding!==null&&typeof r.authorityBinding!=='string'))throw Error('Unsupported saved request.');
 validateBrief(r.brief);r.catalog=parseProviderCatalog(r.catalog);
 validateIntake(r.request,r.catalog);safeProviderURL(r.endpoint,r.endpoint);
 if(canonical(r.request.brief.values.anima_brief)!==canonical(r.brief)||await sourceDigest(r.brief)!==r.sourceDigest)throw Error('The saved source no longer matches its reviewed snapshot.');
 if(await digest(r.request.brief.values)!==r.request.brief.content_hash)throw Error('The saved request changed. Its original has not been replaced.');
 if(r.result){r.result=parseIntakeResult(r.result);assertResult(r,r.result);}
 if(r.projection){r.projection=parseClientProjection(r.projection);assertProjection({...r,projection:null},r.projection);}
 // A tab can close between persistence and receipt. Reconcile; never assume it failed.
 if(r.attempt==='submitting')r.attempt='unknown';
 return r;
}
export interface ReviewStore{load(draftId:string):Promise<SavedReview[]>;save(review:SavedReview):Promise<void>}
function merge(entries:SavedReview[],review:SavedReview):SavedReview[]{
 const previous=entries.find(r=>r.request.request_id===review.request.request_id);
 if(previous){
  if(canonical(previous.request)!==canonical(review.request)||previous.authorityBinding&&previous.authorityBinding!==review.authorityBinding)throw Error('Another tab changed this request. Reload before continuing.');
  if(previous.projection&&!review.projection||previous.result?.state==='admitted'&&review.result?.state!=='admitted')throw Error('A newer provider record is already saved. Reload before continuing.');
  if(review.projection)assertProjection({...review,projection:previous.projection},review.projection);
 }else if(entries.length>=20)throw Error('This workspace has 20 saved reviews. Existing requests have been retained.');
 return structuredClone([review,...entries.filter(r=>r.request.request_id!==review.request.request_id)]);
}
export function reviewStore(memory=false):ReviewStore{
 const cache=new Map<string,SavedReview[]>();let database:Promise<IDBDatabase>;
 function open(){return database??=new Promise((resolve,reject)=>{const r=indexedDB.open('anima-service-reviews',1);r.onupgradeneeded=()=>r.result.createObjectStore('reviews');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 return {async load(id){if(memory)return Promise.all((cache.get(id)||[]).map(parseSavedReview));const db=await open();const records=await new Promise<unknown>((resolve,reject)=>{const tx=db.transaction('reviews'),r=tx.objectStore('reviews').get(id);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});if(records===undefined)return [];if(!Array.isArray(records)||records.length>20)throw Error('Unsupported saved service reviews.');return Promise.all(records.map(parseSavedReview));},async save(review){
  await parseSavedReview(review);
  if(memory){cache.set(review.draftId,merge(cache.get(review.draftId)||[],review));return;}
  const db=await open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('reviews','readwrite'),object=tx.objectStore('reviews'),request=object.get(review.draftId);let conflict:unknown;
   request.onsuccess=()=>{try{const rows=request.result??[];if(!Array.isArray(rows)||rows.some(r=>r?.version!==1))throw Error('Unsupported saved reviews. Nothing replaced.');object.put(merge(rows,review),review.draftId);}catch(error){conflict=error;tx.abort();}};
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(conflict||tx.error||Error('Request saving was interrupted.'));
  });
 }};
}
