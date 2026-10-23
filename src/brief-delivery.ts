import {workspaceBrief,briefMissing,foundationDefinitions,foundationDirection} from './workspace-marketing-model.js';
import {BRIEF_SCHEMA,BRIEF_SCHEMA_V2,LIMITS,sha256,verifyBriefFiles,type BriefDocument,type BriefFile} from '../workspace/brief-delivery.mjs';
import type {BrandState} from '../workspace/domain.mjs';
export async function prepareBriefDelivery(state:BrandState,fileFor:(id:string)=>Promise<Blob|undefined>):Promise<{brief:BriefDocument;files:BriefFile[]}>{
 const shared=workspaceBrief(state);if(briefMissing(shared).length)throw Error('Complete the shared brand questions first.');
 const foundations=foundationDefinitions.map(f=>({id:f.id,...foundationDirection(state,f.id)})).filter(f=>f.notes.trim()||f.assetIds.length);
 const selected=new Set([...shared.assetIds,...foundations.flatMap(f=>f.assetIds)]),references:BriefDocument['references']=[],files:BriefFile[]=[];
 if(selected.size>LIMITS.references)throw Error('Keep up to 64 references in one brief.');
 let total=0;
 for(const id of selected){
  const asset=state.assets.find(a=>a.id===id);if(!asset)throw Error('A selected reference is missing.');
  if(asset.kind==='link'){references.push({id,name:asset.name,kind:'link',url:asset.url});continue;}
  const blob=await fileFor(id);if(!blob)throw Error(`Reattach the original for ${asset.name} before sending.`);
  total+=blob.size;if(blob.size>LIMITS.each||total>LIMITS.total||files.length>=LIMITS.files)throw Error('Keep files under 25 MB total, 10 MB each, and 24 files.');
  references.push({id,name:asset.name,kind:'file',type:blob.type||'application/octet-stream',size:blob.size,sha256:await sha256(await blob.arrayBuffer())});files.push({id,blob});
 }
 const brief:BriefDocument={schema:shared.promptSet==='experience-v3'?BRIEF_SCHEMA_V2:BRIEF_SCHEMA,...(shared.promptSet==='experience-v3'&&shared.peopleEntries?{peopleEntries:[...shared.peopleEntries]}:{}),id:crypto.randomUUID(),createdAt:new Date().toISOString(),brand:Object.fromEntries(['name','description','website'].filter(k=>state.brand[k]?.trim()).map(k=>[k,state.brand[k]!])),answers:Object.fromEntries(Object.entries(shared.answers).filter((pair):pair is [string,string]=>typeof pair[1]==='string')),foundations:foundations.map(f=>({id:f.id,notes:f.notes,referenceIds:f.assetIds})),references};
 await verifyBriefFiles(brief,files);return {brief,files};
}
