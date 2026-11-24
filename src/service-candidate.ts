import {createServiceSignerSelection,serviceSignerChoiceView,type ServiceSignerKind} from './service-signer-selection.js';
import type {ServiceWallet} from './service-wallet.js';
import {reviewedProviderConnection,validateReviewedProviderConnection} from './service-connection-config.js';
import {configuredProviders} from './service-adapter.js';
import {providerDiscovery} from './service-discovery.js';
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
// Transfer is preferred, but no browser/native bridge is installed in this
// candidate. Do not guess a URL scheme or silently use the browser signer.
const signers=createServiceSignerSelection({browser:async()=>{
 walletClient??=createEmbeddedWalletClient();return connectEmbeddedWallet(walletClient);
}});
function notice(title:string,detail:string,onConnected?:(wallet:ServiceWallet)=>Promise<void>){
 root.innerHTML=`<section class="service-panel"><h1>${e(title)}</h1><p>${e(detail)}</p><p class="form-note">No brand material is sent from setup. Membership, receiver approval, transport receipt and service admission are separate.</p>${serviceSignerChoiceView(signers.choices())}<div class="service-actions"><a class="workspace-quiet" href="wallet.html">Open local Wallet</a><button class="workspace-quiet" id="candidate-continue" type="button">Check provider again</button></div><p id="connection-state" role="status" aria-live="polite">Provider not connected.</p></section>`;
 root.setAttribute('aria-busy','false');
 document.querySelector('#candidate-continue')!.addEventListener('click',()=>location.reload(),{once:true});
 root.querySelectorAll<HTMLButtonElement>('[data-service-signer]').forEach(button=>button.addEventListener('click',async()=>{
  if(button.disabled)return;button.disabled=true;
  try{
   const selection=await signers.connect(button.dataset.serviceSigner as ServiceSignerKind);
   const status=root.querySelector<HTMLElement>('#connection-state');
   if(selection.state==='connected'){
    if(onConnected)await onConnected(selection.wallet);
    else if(status)status.textContent='Wallet policy approved for this session. Provider submission is still blocked by the setup requirements above.';
   }else if(status)status.textContent=selection.state==='busy'?'Finish the current Wallet review first.':'Wallet not connected. No other signer was selected and no service request was sent.';
  }catch{notice('Provider not connected','The connection could not be confirmed. Your reviewed material stays local. Check setup before trying again.');root.querySelector<HTMLButtonElement>('#review-embedded-wallet')?.focus();}
  finally{if(button.isConnected){button.disabled=false;button.focus();}}
 }));
}
async function start(){
 mode.textContent='Provider setup · nothing sent';
 const url=new URL(location.href),id=url.searchParams.get('draft');
 if(validDraftId(id)){const back='workspace.html?draft='+encodeURIComponent(id)+'#workspace-requests';document.querySelectorAll<HTMLAnchorElement>('[data-workspace-return],.workspace-home').forEach(a=>a.href=back);}
 const discovery=providerDiscovery({currentOrigin:()=>location.origin});
 if(!discovery.provider)throw Error(discovery.detail);
 const catalog=await discovery.provider.catalog();
 if(catalog.schema!=='service.provider-catalog.v4')throw Error('A reviewed provider catalog v4 is required.');
 if(catalog.services.every(service=>service.availability!=='available')){
  notice('Provider catalog is in preview','The verified Zenith catalog does not yet publish an available service, execution process or communication channel. Submission stays disabled.');return;
 }
 // Source-reviewed app deployment only; discovery/storage cannot install a route.
 const deployment=reviewedProviderConnection;
 if(!deployment){
  notice('Service published · test connection pending','The provider publishes Brand package 1.0.0. This build has no reviewed local test connection. Submission stays disabled. Your brief and references remain local.');return;
 }
 validateReviewedProviderConnection(deployment,location.origin);
 if(!validDraftId(id)||!await workspaceStore.load(id)){
  notice('Choose your reviewed brief','Open your workspace, complete the shared brand questions and choose the material to review. No example brief is created by this live connection.');return;
 }
 notice('Choose your approval surface','You will review the brief before signing or sending it. The browser Wallet can use your saved identity; it does not import a Transfer backup. This is a transport test; returned mock output is not brand work.',async wallet=>{
  const membership=await wallet.getMembership();
  const connection=queueCandidateProvider({purpose:'mock-test',profile:{origin:deployment.origin,baseUrl:deployment.baseUrl,responseBaseUrl:deployment.responseBaseUrl,member:{publicKey:membership.ownerPublicKey,membershipId:membership.membershipId},catalog},currentOrigin:()=>location.origin,wallet:()=>wallet,loadSealer:()=>{const path='../integrations/reviewed-sealer.js';return import(path) as Promise<BrowserSealerModule>;}});
  await connection.connect();configuredProviders.push(connection.provider);url.searchParams.delete('preview');history.replaceState(null,'',url);
  mode.textContent='Transport test · review before sending';await import('./service-review.js');
 });
}
window.addEventListener('pagehide',()=>{signers.dispose();walletClient?.destroy();},{once:true});
void start().catch(error=>{notice('Provider connection is unavailable here',error instanceof Error?error.message:'Provider unavailable.');document.documentElement.dataset.candidateConfig='unavailable';});
