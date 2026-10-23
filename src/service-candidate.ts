import {configuredProviders} from './service-adapter.js';
import {providerDiscovery} from './service-discovery.js';
import {localCandidateProvider,parseLocalCandidateProfile,queueCandidateProvider,parseQueueCandidateProfile} from './service-candidate-provider.js';
import type {ServiceWallet} from './service-wallet.js';
import type {BrowserSealerModule} from './service-sealer.js';
import {emptyState} from '../workspace/domain.mjs';
import * as workspaceStore from '../workspace/store.mjs';
import {saveWorkspaceBrief} from './workspace-marketing-model.js';
import {validDraftId} from '../workspace/introduction.mjs';
import {exampleOriginal} from './service-fixture.js';
import {escape as e} from './page.js';
const root=document.querySelector<HTMLElement>('#service-content')!;
document.querySelector('#service-mode')!.textContent='Candidate · setup pending';
// Intentionally closed until Castalia supplies the embedded consent facade.
// Never fall back to an extension identity or a second signer in this journey.
const wallet=():ServiceWallet|undefined=>undefined;
function notice(title:string,detail:string,action:string){root.innerHTML=`<section class="service-panel"><h1>${e(title)}</h1><p>${e(detail)}</p><p class="form-note">Connection review only. No brand material is sent from this screen. Wallet setup requires your explicit review.</p><div class="service-actions"><a class="workspace-quiet" href="wallet.html">Open local Wallet</a><button class="workspace-quiet" id="candidate-continue" type="button">${e(action)}</button></div><p class="form-note">The embedded Wallet supports local encrypted custody and recovery. Its provider-consent adapter is not connected yet.</p></section>`;root.setAttribute('aria-busy','false');}
async function start(){
 const discovery=providerDiscovery({currentOrigin:()=>location.origin});
 if(!discovery.provider)throw Error(discovery.detail);
 const published=await discovery.provider.catalog();
 if(published.services.every(service=>service.availability!=='available')){
  notice('Provider catalog is in preview','The reviewed Zenith catalog was verified. Its services cannot accept requests yet. No execution process or communication channel is published. '+discovery.detail,'Check catalog again');
  document.querySelector('#service-mode')!.textContent='Live discovery · submission pending';
  document.querySelector('#candidate-continue')!.addEventListener('click',()=>location.reload(),{once:true});return;
 }
 const response=await fetch('tests/local-provider-profile.json',{credentials:'omit',redirect:'error'});
 if(!response.ok)throw Error('The reviewed public provider profile has not been staged. Finite test membership and receiver authority are still required.');
 const raw=await response.json(),queue=typeof raw?.baseUrl==='string'&&raw.baseUrl.startsWith('https:');
 const profile=(queue?parseQueueCandidateProfile:parseLocalCandidateProfile)(raw);if(profile.origin!==location.origin)throw Error('The candidate profile belongs to another browser origin.');
 const sealerPath='../integrations/reviewed-sealer.js';
 const connection=(queue?queueCandidateProvider:localCandidateProvider)({profile,currentOrigin:()=>location.origin,wallet,loadSealer:()=>import(sealerPath) as Promise<BrowserSealerModule>});
 notice('Connect the test Wallet','Anima’s embedded Wallet is available for local setup. Real submission still requires the supported provider-consent adapter and a reviewed finite membership.','Check Wallet connection');
 document.querySelector<HTMLButtonElement>('#candidate-continue')!.addEventListener('click',async()=>{
  const button=document.querySelector<HTMLButtonElement>('#candidate-continue')!;button.disabled=true;root.setAttribute('aria-busy','true');
  try{
   const w=wallet();if(!w)throw Error('The embedded Wallet’s service-consent adapter is not connected yet. Local setup and encrypted recovery are available from Open local Wallet. Nothing has been submitted.');
   await connection.connect();
   const url=new URL(location.href),requested=url.searchParams.get('draft');
   let id=validDraftId(requested)?requested:null,existing=id?await workspaceStore.load(id):null;
   // Never seed, replace or import into an owner draft selected in the URL.
   if(existing?.world?.animaCandidateIntegration!==true){
    id=crypto.randomUUID();
    const state=saveWorkspaceBrief({...emptyState(),brand:{name:'Disposable Anima integration'},assets:[{id:'candidate-original',name:'Candidate original.png',kind:'file',type:'image/png',size:exampleOriginal.size}]},{version:1,promptSet:'experience-v3',answers:{brand:'A disposable practice used only to qualify the integration.',body:'Unhurried and at ease.',emotion:'Quiet, clear and welcoming. This is disposable acceptance material.',people:'People reviewing the Anima integration; no real client profile.',world:'A calm shared place for a small creative practice.',signature:'Reviewing a brief together before beginning work.'},assetIds:['candidate-original'],outputs:[]});
    state.world={...state.world,animaCandidateIntegration:true};await workspaceStore.save(id,state,[['candidate-original',new File([exampleOriginal],'Candidate original.png',{type:'image/png'})]]);
   }
   url.searchParams.delete('preview');url.searchParams.set('draft',id!);history.replaceState(null,'',url);
   configuredProviders.push(connection.provider);
   await import('./service-review.js');
  }catch(error){notice('Candidate not connected',error instanceof Error?error.message:'Connection unavailable. No service request submitted.','Try connection again');document.querySelector('#candidate-continue')!.addEventListener('click',()=>location.reload(),{once:true});}
 });
}
void start().catch(error=>{notice('Provider connection is unavailable here',error instanceof Error?error.message:'The candidate is unavailable.','Check setup again');document.documentElement.dataset.candidateConfig='unavailable';document.querySelector('#candidate-continue')!.addEventListener('click',()=>location.reload(),{once:true});});
