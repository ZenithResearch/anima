import {producerFixtures} from './provider-fixture-data.js';
import {ServiceClient,parseProviderCatalog,parseClientProjection,ServiceClientError,type ProviderCatalog,type IntakeRequest,type IntakeResult,type ClientProjection,type ArtifactManifest,type ReceiptReference} from './vendor/service-client.js';
import type {EncryptedBundlePort} from './service-encrypted-outbox.js';
import {sha256} from '../workspace/brief-delivery.mjs';
import {unavailableAccess,type ProviderAdapter,type AccessState} from './service-adapter.js';
export const scenarios=['waiting','qualification','planned','running','information','review','delivered','rejected','failed','unknown','offline','expired-session','locked-identity','enrollment-pending','denied','corrupt-artifact','other-account','expired-authority','partial-work'] as const;
export type Scenario=typeof scenarios[number];
export const exampleBytes=new TextEncoder().encode('ANIMA — EXAMPLE ONLY\n\nBrand foundation notes\nA luminous, quietly alive identity.\n\nThis is a disposable interface fixture, not commissioned work.\n');
export const exampleOriginal=new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0))],{type:'image/png'});
const receiptBytes=new TextEncoder().encode(JSON.stringify({schema:'runtime.receipt.v1',fixture:true,signature:null,note:'Illustrative receipt; no real execution or cryptographic authorship.'}));
export class FixtureProvider implements ProviderAdapter{
 readonly mode='fixture' as const;get endpoint(){return this.alternate?'https://studio.example.invalid':'https://provider.example.invalid';}scenario:Scenario='waiting';private request:IntakeRequest|null=null;
 constructor(readonly alternate=false){}
 readonly encrypted:EncryptedBundlePort={
  prepare:async(request,catalog,reference)=>{
   this.authorize();this.request=structuredClone(request);
   // Disposable markers are NOT ciphertext. Only SDK composition is exercised.
   const marker=(kind:string)=>new TextEncoder().encode('EXAMPLE-NOT-ENCRYPTED:'+kind+':'+request.request_id);
   return this.client().prepareEncryptedBundle(request,catalog,reference,{authority:{evidence:async()=>new TextEncoder().encode('EXAMPLE-NOT-A-PROOF')},sealer:{seal:async()=>marker('request')},referenceSealer:{sealReferenceObject:async()=>marker('reference')}});
  },
  sendRequest:prepared=>this.client().sendPreparedEncrypted(prepared,{authorize:async()=>{this.authorize();return {};}}),
  sendReference:prepared=>this.client().sendPreparedEncryptedReference(prepared,{authorize:async()=>{this.authorize();return {};}})
 };
 private client(){return new ServiceClient({baseUrl:this.endpoint,authorize:async()=>({}),fetch:async(input)=>{
  this.authorize();const request=this.request;if(!request)throw Error('No prepared example request.');
  if(String(input).endsWith('/reference-objects')){
   const manifest=request.references[0]!;
   if(this.scenario==='unknown')throw Error('Example reference acknowledgement lost.');
   return new Response(JSON.stringify({schema:'service.reference-object-result.v1',request_id:request.request_id,idempotency_key:request.idempotency_key,artifact_id:manifest.artifact_id,content_hash:manifest.content_hash,state:'pending',transport_receipt:{transport:'example-reference-inbox',receipt_id:'reference-example-01',recorded_at:new Date().toISOString(),expires_at:null}}),{status:202});
  }
  return new Response(JSON.stringify(await this.submit(request,await this.catalog())),{status:202});
 }});}
 access():AccessState{
  const state:AccessState={identity:'ready',enrollment:'verified',membership:'verified',session:'authenticated',workspace:'authorized',binding:'example-authority-a'};
  if(this.scenario==='locked-identity')return {...state,identity:'locked',session:'unavailable',workspace:'unavailable',binding:null};
  if(this.scenario==='enrollment-pending')return {...unavailableAccess(),identity:'ready',enrollment:'pending'};
  if(this.scenario==='expired-session')return {...state,session:'expired',workspace:'unavailable',binding:null};
  if(this.scenario==='other-account')return {...state,binding:'example-authority-b'};
  if(this.scenario==='expired-authority')return {...state,workspace:'expired'};
  if(this.scenario==='denied')return {...state,workspace:'denied'};
  return state;
 }
 async catalog():Promise<ProviderCatalog>{
  const data=structuredClone(producerFixtures['provider-catalog-v4.fixture.json']);
  data.intake.endpoint=this.endpoint+'/v1/client/requests';data.reference_objects.endpoint=this.endpoint+'/v1/client/reference-objects';
  data.provider.name=this.alternate?'Example studio':'Zenith · example';data.provider.id=this.alternate?'example-studio':'zenith';
  for(const s of data.services){s.id=this.alternate?'example-studio.brand-package':s.id;s.summary='Illustrative service. Nothing is sent or produced in this preview.';s.inputs=s.inputs.map(i=>({...i,required:i.id==='organization_name'?false:i.required}));s.expected_deliverables=[{id:'brand-package',label:'Example foundation notes',media_types:['text/plain'],multiple:false}];}
  return parseProviderCatalog(data);
 }
 private authorize(){const a=this.access();if(!a.binding||a.session!=='authenticated'||a.workspace!=='authorized')throw new ServiceClientError('forbidden','This example has no active workspace authority.');if(this.scenario==='offline')throw new ServiceClientError('unavailable','The example provider is offline.',{retryable:true});}
 async upload(manifest:ArtifactManifest,_bytes:Uint8Array){this.authorize();return structuredClone(manifest);}
 async submit(request:IntakeRequest,_catalog:ProviderCatalog):Promise<IntakeResult>{
  this.authorize();this.request=structuredClone(request);
  if(this.scenario==='unknown')throw new ServiceClientError('transport_error','Example acknowledgement lost. The provider may have received this exact request.',{retryable:true,uncertain:true});
  return {schema:'service.intake-result.v1',request_id:request.request_id,idempotency_key:request.idempotency_key,state:this.scenario==='rejected'?'rejected':'pending',transport_receipt:{transport:'example-inbox',receipt_id:'example-transport-01',recorded_at:new Date().toISOString(),expires_at:null},service_request_id:null,service_request_version:null,status_url:'/v1/client/requests/'+request.request_id};
 }
 async statusForRequest(id:string):Promise<ClientProjection>{return this.status('',id);}
 async status(_url:string,id:string):Promise<ClientProjection>{
  this.authorize();if(!this.request||id!==this.request.request_id)throw new ServiceClientError('not_found','This example request is not known.',{retryable:true});
  const raw=structuredClone(producerFixtures['request-delivered.fixture.json']) as unknown as ClientProjection;
  raw.request_id=this.request.request_id;raw.idempotency_key=this.request.idempotency_key;raw.provider_id=this.request.service.provider_id;raw.service_id=this.request.service.service_id;raw.updated_at=new Date().toISOString();raw.execution!.observed_at=raw.updated_at;
  const finish=['delivered','corrupt-artifact','partial-work'].includes(this.scenario);
  if(finish){const d=raw.deliverables[0]!;d.label='Example foundation notes';d.artifact={schema:'service.artifact-manifest.v1',artifact_id:'example-notes-01',filename:'example-foundation-notes.txt',media_type:'text/plain',byte_length:exampleBytes.length,content_hash:await sha256(exampleBytes)};d.href='/v1/client/artifacts/'+d.artifact.content_hash;const receipt=raw.receipts[0]!;receipt.content_hash=await sha256(receiptBytes);receipt.verification={state:'unverified',verifier:null,detail:'Illustrative unsigned execution receipt. No real work was performed.'};}
  else {raw.deliverables=[];raw.receipts=[];}
  if(this.scenario==='waiting'||this.scenario==='unknown'){raw.transport.state='pending';raw.service_request=null;raw.case=null;raw.execution=null;}
  else if(this.scenario==='qualification'){raw.service_request!.state='intake';raw.service_request!.case_id=null;raw.case=null;raw.execution=null;}
  else if(this.scenario==='rejected'){raw.service_request!.state='rejected';raw.service_request!.case_id=null;raw.case=null;raw.execution=null;}
  else if(!finish){raw.execution!.state=({planned:'awaiting_plan',running:'running',information:'blocked',review:'succeeded',failed:'failed'} as const)[this.scenario as 'planned']||'unknown';}
  if(this.scenario==='partial-work')raw.execution!.state='running';
  return parseClientProjection(raw);
 }
 async artifact(_href:string,_hash:string):Promise<Uint8Array>{this.authorize();return this.scenario==='corrupt-artifact'?new TextEncoder().encode('Changed example bytes'):exampleBytes.slice();}
 async receipt(reference:ReceiptReference):Promise<unknown>{this.authorize();if(await sha256(receiptBytes)!==reference.content_hash)throw new ServiceClientError('receipt_mismatch','The example receipt changed.');return JSON.parse(new TextDecoder().decode(receiptBytes));}
}
