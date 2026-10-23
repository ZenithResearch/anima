import {readBrandPackage,type BrandPackageDraft} from './brand-package-model.js';
export type ReferenceFiles=Map<string,File>;
type StoredPreview={version:1;draft:BrandPackageDraft;files:Array<{id:string;file:File}>};
let database:Promise<IDBDatabase>|undefined;
function open():Promise<IDBDatabase>{
 return database??=new Promise((resolve,reject)=>{
  const request=indexedDB.open('anima-brand-package-preview',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('previews');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>{database=undefined;reject(request.error);};
 });
}
export async function loadBrandPreview(scope='current'):Promise<{raw:unknown;files:ReferenceFiles}|null>{
 const db=await open();const record:unknown=await new Promise((resolve,reject)=>{const tx=db.transaction('previews'),r=tx.objectStore('previews').get(scope);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});
 if(record===undefined)return null;
 const value=record as Partial<StoredPreview>;
 if(value?.version!==1||!readBrandPackage(value.draft))return {raw:record,files:new Map()};
 const allowed=new Set(value.draft!.references?.filter(r=>r.kind==='file').map(r=>r.id));
 const files=new Map<string,File>();
 for(const item of Array.isArray(value.files)?value.files:[])if(item&&allowed.has(item.id)&&item.file instanceof File)files.set(item.id,item.file);
 return {raw:value.draft,files};
}
export async function saveBrandPreview(draft:BrandPackageDraft,files:ReferenceFiles,scope='current'):Promise<void>{
 const next=readBrandPackage(draft);if(!next)throw Error('This draft cannot be saved in the current preview.');
 const selected:Array<{id:string;file:File}>=[];
 for(const ref of next.references||[]){if(ref.kind!=='file')continue;const file=files.get(ref.id);if(!file)throw Error(`Reselect ${ref.name} before saving, or remove that reference.`);selected.push({id:ref.id,file});}
 const db=await open();
 await new Promise<void>((resolve,reject)=>{
  // Answers, links and original files replace one record in the same transaction.
  // Removing a reference removes its saved blob only when this save succeeds.
  const tx=db.transaction('previews','readwrite'),store=tx.objectStore('previews'),read=store.get(scope);
  let conflict=false;
  read.onsuccess=()=>{const old=read.result;if(old!==undefined&&(old?.version!==1||!readBrandPackage(old.draft))){conflict=true;tx.abort();return;}store.put({version:1,draft:next,files:selected} satisfies StoredPreview,scope);};
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(conflict?Error('An incompatible saved preview is already here. Download your answers instead; it was not changed.'):tx.error||Error('Saving was interrupted. Your previous saved draft is unchanged.'));
 });
}
