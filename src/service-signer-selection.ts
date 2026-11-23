import type {ServiceWallet} from './service-wallet.js';
import {escape as e} from './page.js';
// Anima composition only, not a signer/identity protocol. Adapters are supplied
// explicitly; a failed/denied native attempt never selects a browser identity.
export type ServiceSignerKind='transfer'|'browser';
type Connector=()=>Promise<ServiceWallet|null>;
export type ServiceSignerChoice={kind:ServiceSignerKind;label:string;available:boolean};
export type ServiceSignerResult=
 |{state:'connected';kind:ServiceSignerKind;wallet:ServiceWallet}
 |{state:'not-connected'|'unavailable'|'busy'|'context-changed';kind:ServiceSignerKind};
export function createServiceSignerSelection(ports:Partial<Record<ServiceSignerKind,Connector>>){
 let busy=false,closed=false,revision=0;
 const choices=():ServiceSignerChoice[]=>[
  {kind:'transfer',label:'Use Zenith Transfer',available:typeof ports.transfer==='function'},
  {kind:'browser',label:'Use browser Wallet',available:typeof ports.browser==='function'},
 ];
 return {
  choices,
  async connect(kind:ServiceSignerKind):Promise<ServiceSignerResult>{
   if(kind!=='transfer'&&kind!=='browser')throw Error('Choose a supported approval surface.');
   if(closed)return {state:'context-changed',kind};
   if(busy)return {state:'busy',kind};
   const connect=ports[kind];if(!connect)return {state:'unavailable',kind};
   const before=++revision;busy=true;
   try{
    const wallet=await connect();
    if(closed||revision!==before)return {state:'context-changed',kind};
    return wallet?{state:'connected',kind,wallet}:{state:'not-connected',kind};
   }catch{return {state:closed||revision!==before?'context-changed':'unavailable',kind};}
   finally{busy=false;}
  },
  dispose(){closed=true;revision++;}
 };
}
export function serviceSignerChoiceView(choices:readonly ServiceSignerChoice[]):string{
 return `<div class="service-actions" role="group" aria-label="Approval surface">${choices.map(choice=>`<button class="anima-button" id="${choice.kind==='browser'?'review-embedded-wallet':'connect-transfer-wallet'}" data-service-signer="${e(choice.kind)}" type="button" ${choice.available?'':'disabled'}${choice.kind==='transfer'?' aria-describedby="signer-transfer-status"':''}>${e(choice.label)}</button>`).join('')}</div><p class="form-note" id="signer-transfer-status">Zenith Transfer is preferred on macOS. ${choices.find(c=>c.kind==='transfer')?.available?'Review each signing request in Transfer.':'Its browser signing connection is not available in this build.'} Choose browser Wallet explicitly to use your saved browser identity.</p>`;
}
