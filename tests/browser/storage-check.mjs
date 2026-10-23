import {emptyState} from '../../workspace/domain.mjs';
import * as workspace from '../../workspace/store.mjs';
import {saveWorkspaceBrief,saveFoundationDirection} from '../../runtime/workspace-marketing-model.js';
import {prepareBriefDelivery} from '../../runtime/brief-delivery.js';
import {prepareServiceReview,canonical} from '../../runtime/service-review-model.js';
import {reviewStore} from '../../runtime/service-review-store.js';
import {FixtureProvider} from '../../runtime/service-fixture.js';
const button=document.querySelector('button'),output=document.querySelector('output');
const expect=(condition,message)=>{if(!condition)throw Error(message);};
function report(message){output.textContent+=message+'\n';}
async function cleanup(name,stores,keys){const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});try{await new Promise((resolve,reject)=>{const tx=db.transaction(stores,'readwrite');for(const [store,key] of keys)tx.objectStore(store).delete(key);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
button.addEventListener('click',async()=>{
 button.disabled=true;output.textContent='';const draft=crypto.randomUUID(),asset=crypto.randomUUID();let wroteReview=false,wroteWorkspace=false;
 try{
 const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6z3QAAAAASUVORK5CYII='),c=>c.charCodeAt(0)),file=new File([png],'disposable-storage.png',{type:'image/png'});
 let state=saveWorkspaceBrief({...emptyState(),brand:{name:'Disposable storage check'},world:{legacyNote:'Retain earlier material'},assets:[{id:asset,name:file.name,kind:'file',type:file.type,size:file.size}]},{version:1,promptSet:'feeling-v2',answers:{feeling:'Quietly alive',people:'Independent practices',world:'An inner world',signature:'Being seen fully'},assetIds:[asset],outputs:[]});
 state=saveFoundationDirection(state,'logo',{notes:'Open shapes',assetIds:[asset]});
 await workspace.save(draft,state,[[asset,file]]);wroteWorkspace=true;
 const loaded=await workspace.load(draft),original=await workspace.file(asset);expect(canonical(loaded)===canonical(state),'Workspace roundtrip changed the draft');expect(original,'Original file missing');const restoredBytes=new Uint8Array(await original.arrayBuffer());expect(restoredBytes.length===png.length&&restoredBytes.every((v,i)=>v===png[i]),'Original file bytes changed');report('PASS · existing workspace state, earlier fields, foundation associations and original file survive IndexedDB roundtrip.');
 const {brief}=await prepareBriefDelivery(loaded,id=>workspace.file(id)),adapter=new FixtureProvider(),catalog=await adapter.catalog();
 const review=await prepareServiceReview({draftId:draft,brief,catalog,endpoint:adapter.endpoint,serviceId:catalog.services[0].id,values:{brand_brief:'Storage fixture'}});review.attempt='submitting';
 const store=reviewStore();await store.save(review);wroteReview=true;const restored=(await reviewStore().load(draft))[0];expect(restored.attempt==='unknown','Interrupted request did not restore as unknown');expect(canonical(restored.request)===canonical(review.request),'Request identity or snapshot changed');report('PASS · separate request database reopens an interrupted submission as unknown with the exact same body and identity.');
 const changed=saveWorkspaceBrief(loaded,{...loaded.world.packageBrief,answers:{...loaded.world.packageBrief.answers,feeling:'Changed after review'}});await workspace.save(draft,changed);expect((await store.load(draft))[0].brief.answers.feeling==='Quietly alive','Workspace edit mutated the frozen review');report('PASS · editing workspace material does not rewrite its reviewed request.');
 await adapter.submit(restored.request,restored.catalog);adapter.scenario='delivered';const projection=await adapter.status('',restored.request.request_id);restored.attempt='admitted';restored.projection=projection;await store.save(restored);
 const older=structuredClone(restored);older.projection.service_request.version=1;let rejected=false;try{await store.save(older);}catch{rejected=true;}expect(rejected,'Older provider record overwrote newer work');expect((await store.load(draft))[0].projection.service_request.version===projection.service_request.version,'Latest projection not retained');report('PASS · IndexedDB merge rejects an older provider revision and retains the newer work.');
 }catch(error){report('FAIL · '+error.message);}finally{
  try{if(wroteWorkspace)await cleanup('anima-brand-workspace',['state','files'],[['state',draft],['files',asset]]);if(wroteReview)await cleanup('anima-service-reviews',['reviews'],[['reviews',draft]]);report('Disposable test records removed. No owner draft or file was accessed.');}catch(error){report('Cleanup incomplete for disposable scope '+draft+': '+error.message);}
  button.disabled=false;
 }
});
