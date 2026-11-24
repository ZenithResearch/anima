import type {MatrixCompanion} from './vendor/matrix-companion.js';
import {matrixApprovalView,type MatrixApprovalView} from './matrix-companion-read.js';
// Application-side observation only. No approve, deny, signing, credential or
// transport operation belongs here. Closing observation is not Wallet cancel.
type ApprovalReadClient=Pick<MatrixCompanion,'getApprovalStatus'>;
type PreparedApproval=Pick<Awaited<ReturnType<MatrixCompanion['prepareConnection']>>,'approval_id'|'expires_at'>;
export type MatrixApprovalObservation=
 |{kind:'wallet-result';approval:MatrixApprovalView}
 |{kind:'observation-ended';reason:'closed'|'deadline'|'context-changed'|'unavailable'};
interface Options {
 signal:AbortSignal;
 isCurrent():boolean;
 expected:'connection'|'delivery';
 now?:()=>number;
 pause?:(milliseconds:number,signal:AbortSignal)=>Promise<void>;
}
function pause(milliseconds:number,signal:AbortSignal):Promise<void>{
 return new Promise(resolve=>{if(signal.aborted){resolve();return;}const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);resolve();};const timer=setTimeout(finish,milliseconds);signal.addEventListener('abort',finish,{once:true});});
}
function readBounded(client:ApprovalReadClient,id:string,remaining:number,signal:AbortSignal):Promise<{value:Awaited<ReturnType<MatrixCompanion['getApprovalStatus']>>}|{reason:'closed'|'deadline'|'unavailable'}>{
 return new Promise(resolve=>{
  if(signal.aborted){resolve({reason:'closed'});return;}
  let done=false;
  const end=(value:{value:Awaited<ReturnType<MatrixCompanion['getApprovalStatus']>>}|{reason:'closed'|'deadline'|'unavailable'})=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);resolve(value);};
  const abort=()=>end({reason:'closed'}),timer=setTimeout(()=>end({reason:'deadline'}),remaining);
  signal.addEventListener('abort',abort,{once:true});
  // Handle synchronous throws too; never forward arbitrary SDK error text.
  Promise.resolve().then(()=>client.getApprovalStatus({schema:'castalia.matrix-approval-status-request.v1',approval_id:id})).then(value=>end({value}),()=>end({reason:'unavailable'}));
 });
}
export async function observeMatrixApproval(client:ApprovalReadClient,prepared:PreparedApproval,options:Options):Promise<MatrixApprovalObservation>{
 const now=options.now??Date.now,wait=options.pause??pause,ended=(reason:'closed'|'deadline'|'context-changed'|'unavailable'):MatrixApprovalObservation=>({kind:'observation-ended',reason});
 if(!/^[A-Za-z0-9._:-]{1,200}$/.test(prepared.approval_id)||!Number.isSafeInteger(prepared.expires_at))return ended('unavailable');
 // The UI deadline bounds observation only; it does not claim Wallet expiry.
 const deadline=Math.min(prepared.expires_at,now()+120_000);
 for(;;){
  if(options.signal.aborted)return ended('closed');
  if(!options.isCurrent())return ended('context-changed');
  const remaining=deadline-now();if(remaining<=0)return ended('deadline');
  const read=await readBounded(client,prepared.approval_id,remaining,options.signal);
  if(options.signal.aborted)return ended('closed');
  if(!options.isCurrent())return ended('context-changed');
  if(now()>=deadline)return ended('deadline');
  if('reason' in read)return ended(read.reason);
  let approval:MatrixApprovalView;
  try{approval=matrixApprovalView(read.value);}catch{return ended('unavailable');}
  if(approval.state!=='pending'){
   if(approval.state==='approved'&&(options.expected==='connection'?!approval.connection:!approval.delivery))return ended('unavailable');
   return {kind:'wallet-result',approval};
  }
  try{await wait(Math.min(500,deadline-now()),options.signal);}catch{return ended('unavailable');}
 }
}
