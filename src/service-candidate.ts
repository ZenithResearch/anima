import {reviewedProviderConnection} from './service-connection-config.js';
import {configuredProviders} from './service-adapter.js';
import {providerDiscovery,zenithPilotDiscovery} from './service-discovery.js';
import {queueCandidateProvider} from './service-candidate-provider.js';
import {createEmbeddedWalletClient} from './embedded-wallet-client.js';
import {connectEmbeddedWallet} from './embedded-wallet-connection.js';
import type {BrowserSealerModule} from './service-sealer.js';
import * as workspaceStore from '../workspace/store.mjs';
import {validDraftId} from '../workspace/introduction.mjs';
import {escape as e} from './page.js';
const root=document.querySelector<HTMLElement>('#service-content')!;
const mode=document.querySelector('#service-mode')!;
let walletClient:ReturnType<typeof createEmbeddedWalletClient>|undefined;
function notice(title:string,detail:string){
 root.innerHTML=`<section class="service-panel"><h1>${e(title)}</h1><p>${e(detail)}</p><p class="form-note">No brand material is sent from setup. Membership, receiver approval, transport receipt and service admission are separate.</p><div class="service-actions"><a class="workspace-quiet" href="wallet.html">Open local Wallet</a><button class="workspace-quiet" id="review-embedded-wallet" type="button">Review Wallet connection</button><button class="workspace-quiet" id="candidate-continue" type="button">Check provider again</button></div><p id="connection-state" role="status" aria-live="polite">Provider not connected.</p></section>`;
 root.setAttribute('aria-busy','false');
 document.querySelector('#candidate-continue')!.addEventListener('click',()=>location.reload(),{once:true});
 document.querySelector('#review-embedded-wallet')!.addEventListener('click',async()=>{
  walletClient??=createEmbeddedWalletClient();const wallet=await connectEmbeddedWallet(walletClient);
  document.querySelector('#connection-state')!.textContent=wallet?'Wallet policy approved for this session. Provider submission is still blocked by the setup requirements above.':'Wallet not connected. No service request sent.';
 });
}
async function start(){
 mode.textContent='Provider setup · nothing sent';
 const discovery=providerDiscovery({currentOrigin:()=>location.origin});
 if(!discovery.provider)throw Error(discovery.detail);
 const catalog=await discovery.provider.catalog();
 if(catalog.schema!=='service.provider-catalog.v4')throw Error('A reviewed provider catalog v4 is required.');
 if(catalog.services.every(service=>service.availability!=='available')){
  notice('Provider catalog is in preview','The verified Zenith catalog does not yet publish an available service, execution process or communication channel. Submission stays disabled.');return;
 }
 // Source-reviewed app deployment only; discovery/storage cannot install a route.
 const deployment=reviewedProviderConnection;
 if(!deployment)throw Error('The separately reviewed response projection address is not configured. Keep the current draft local until the provider handoff is complete.');
 if(Object.keys(deployment).sort().join(',')!=='baseUrl,catalogSha256,origin,responseBaseUrl'||deployment.origin!==location.origin||deployment.baseUrl!==zenithPilotDiscovery.baseUrl||deployment.catalogSha256!==zenithPilotDiscovery.catalogSha256)throw Error('The staged connection does not match this reviewed provider release.');
 const url=new URL(location.href),id=url.searchParams.get('draft');
 if(!validDraftId(id)||!await workspaceStore.load(id)){
  notice('Choose your reviewed brief','Open your workspace, complete the shared brand questions and choose the material to review. No example brief is created by this live connection.');return;
 }
 notice('Connect your Wallet','Unlock your saved identity, review membership if needed, and approve the receiver policy. You will review the brief before signing or sending it.');
 const old=document.querySelector<HTMLButtonElement>('#review-embedded-wallet')!,button=old.cloneNode(true) as HTMLButtonElement;old.replaceWith(button);
 button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
   walletClient??=createEmbeddedWalletClient();const wallet=await connectEmbeddedWallet(walletClient);if(!wallet)return;
   const membership=await wallet.getMembership();
   const connection=queueCandidateProvider({purpose:'reviewed-pilot',profile:{origin:deployment.origin,baseUrl:deployment.baseUrl,responseBaseUrl:deployment.responseBaseUrl,member:{publicKey:membership.ownerPublicKey,membershipId:membership.membershipId},catalog},currentOrigin:()=>location.origin,wallet:()=>wallet,loadSealer:()=>{const path='../integrations/reviewed-sealer.js';return import(path) as Promise<BrowserSealerModule>;}});
   await connection.connect();configuredProviders.push(connection.provider);url.searchParams.delete('preview');history.replaceState(null,'',url);
   mode.textContent='Reviewed pilot · review before sending';await import('./service-review.js');
  }catch(error){notice('Provider not connected',error instanceof Error?error.message:'Connection unavailable. No request sent.');}
  finally{button.disabled=false;}
 });
}
window.addEventListener('pagehide',()=>walletClient?.destroy(),{once:true});
void start().catch(error=>{notice('Provider connection is unavailable here',error instanceof Error?error.message:'Provider unavailable.');document.documentElement.dataset.candidateConfig='unavailable';});
