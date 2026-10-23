// Separate Anima origin/namespace. Original Juiced state and files are never
// imported or modified implicitly. Contact details are not stored in this DB.
let database;
function open(){
 return database??=new Promise((resolve,reject)=>{
  const request=indexedDB.open('anima-brand-workspace',1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('state');request.result.createObjectStore('files');};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
export async function load(id){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('state'),request=tx.objectStore('state').get(id);tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);});}
export async function save(id,state,files=[],removed=[]){
 const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['state','files'],'readwrite');
  tx.objectStore('state').put(state,id);
  for(const [key,file] of files)tx.objectStore('files').put(file,key);
  for(const key of removed)tx.objectStore('files').delete(key);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Saving was interrupted.'));
 });
}
export async function file(id){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('files'),r=tx.objectStore('files').get(id);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}
