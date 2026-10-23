import type * as SecS from './vendor/secs-intake-sealer.js';
import {ServiceClientError,type IntakeEnvelopeSealer,type ReferenceObjectEnvelopeSealer} from './vendor/service-client.js';

// This port accepts the producer package's exact API. Application composition
// supplies a pinned local module only after release review; no URL discovery,
// browser-global crypto replacement or identity/key generation belongs here.
export type BrowserSealerModule=Pick<typeof SecS,'createBrowserIntakeEnvelopeSealer'>;
export type LoadBrowserSealer=()=>Promise<BrowserSealerModule>;
export const browserSealerReadiness='source-qualified-unreleased' as const;

export interface CandidateIntakeSealer extends IntakeEnvelopeSealer,ReferenceObjectEnvelopeSealer {
 sealReferenceObject:SecS.IntakeEnvelopeSealer['sealReferenceObject'];
}

export function candidateIntakeSealer(load?:LoadBrowserSealer):CandidateIntakeSealer {
 let initialized:Promise<SecS.IntakeEnvelopeSealer>|undefined;
 async function producer():Promise<SecS.IntakeEnvelopeSealer>{
   if(!load)throw new ServiceClientError('unavailable','The reviewed browser sealer package is not installed. Nothing sent.');
   // Factory/profile validation and all sealing remain in the secS producer.
   // Cache a rejected initialization too: recovery is an explicit re-composition,
   // never an automatic alternative implementation or resealing path.
   initialized??=load().then(module=>module.createBrowserIntakeEnvelopeSealer());
   return initialized;
 }
 return {
  async seal(input){return (await producer()).seal(input);},
  async sealReferenceObject(input){
   const sealer=await producer();
   if(typeof sealer.sealReferenceObject!=='function')throw new ServiceClientError('unavailable','This producer package does not support encrypted reference objects. Nothing sent.');
   return sealer.sealReferenceObject(input);
  }
 };
}
