import {escape as e} from './page.js';
import type {EmbeddedWalletClient} from './embedded-wallet-client.js';
import type {PresentationPreview} from './embedded-wallet-host.js';
import {embeddedWalletProfile as profile,requireEmbeddedOrigin} from './embedded-wallet-profile.js';
import {embeddedServiceWallet} from './embedded-service-wallet.js';
import type {ServiceWallet} from './service-wallet.js';
// Native modal, shared fields/actions. State stays in the same private worker.
export async function connectEmbeddedWallet(client:EmbeddedWalletClient):Promise<ServiceWallet|null>{
 const trigger=document.activeElement as HTMLElement|null,dialog=document.createElement('dialog');
 dialog.className='service-panel wallet-connection';dialog.setAttribute('aria-labelledby','wallet-connection-title');
 document.body.append(dialog);let busy=false,finished=false;
 return new Promise(resolve=>{
  const close=(value:ServiceWallet|null)=>{if(finished)return;finished=true;dialog.close();dialog.remove();trigger?.focus();resolve(value);};
  const frame=(body:string)=>{dialog.innerHTML=`<div class="wallet-heading"><h2 id="wallet-connection-title">Connect Wallet</h2><button type="button" class="anima-button" data-close aria-label="Close Wallet connection">Close</button></div><div id="wallet-step">${body}</div><p id="wallet-connection-status" role="status" aria-live="polite" tabindex="-1"></p>`;dialog.querySelector('[data-close]')!.addEventListener('click',()=>{if(!busy){void client.cancelPresentation();close(null);}});if(dialog.open)dialog.querySelector<HTMLButtonElement>('[data-close]')?.focus();};
  const status=(message:string)=>{const node=dialog.querySelector<HTMLElement>('#wallet-connection-status');if(node){node.textContent=message;node.focus();}};
  const run=async(task:()=>Promise<void>)=>{if(busy)return;busy=true;dialog.setAttribute('aria-busy','true');dialog.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=true);try{await task();}catch(error){frame('<p>Connection could not be confirmed. Your existing identity has not been replaced.</p><button type="button" class="anima-button" data-retry>Try again</button>');status(error instanceof Error?error.message:'Connection unavailable.');dialog.querySelector('[data-retry]')!.addEventListener('click',()=>void run(show));}finally{busy=false;dialog.removeAttribute('aria-busy');dialog.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=false);}};
  async function show(){
   try{requireEmbeddedOrigin(location.origin);}catch(error){frame(`<p>${e(error instanceof Error?error.message:'Origin is not approved.')}</p><p class="form-note">No trust installed, membership created or material sent. This is a deployment configuration gate.</p>`);return;}
   const state=await client.state();
   if(!state.configured){frame('<p>Create or restore your local Castalia Wallet first.</p><a class="anima-button" href="wallet.html">Set up Wallet</a>');return;}
   if(!state.unlocked){frame('<p>Unlock your saved identity for this page. Your password stays in the embedded Wallet.</p><form><label class="anima-field" data-density="compact"><span>Browser password</span><input name="password" class="anima-control" type="password" required maxlength="4096" autocomplete="current-password"></label><button class="anima-button" type="submit">Unlock Wallet</button></form>');dialog.querySelector('form')!.addEventListener('submit',event=>{event.preventDefault();const form=event.target as HTMLFormElement;if(!form.reportValidity())return;const password=String(new FormData(form).get('password')||'');form.reset();void run(async()=>{await client.unlock(password);await show();});});return;}
   if(!state.backup_eligible){frame('<p>Save and test your recovery file before connecting.</p><a class="anima-button" href="wallet.html">Save and test recovery</a>');return;}
   if(!state.membership_active){
    frame(`<h3>Join Zenith</h3><p>This shares your public identity and a signed possession proof with Zenith’s membership issuer.</p><p class="wallet-key"><code>${e(state.public_key||'')}</code></p><dl><dt>Issuer</dt><dd>${e(profile.issuerOrigin)}</dd><dt>Verification key</dt><dd class="wallet-key"><code>${e(profile.membershipPublicKey)}</code></dd></dl><p class="form-note">Approving trusts this issuer for membership. It does not submit your brief, sign you into a workspace or grant provider authority.</p><button type="button" class="anima-button" data-tone="light" data-join>Approve and join Zenith</button>`);
    dialog.querySelector('[data-join]')!.addEventListener('click',()=>void run(async()=>{await client.joinZenith();await show();}));return;
   }
   const identity=await client.connectionIdentity();
   if(identity.membership.schema!=='castalia.zenith-membership-credential.v3'||identity.membership.version!==3)throw Error('This service requires a verified Zenith base membership. A scoped credential does not substitute for it.');
   if(identity.membership.issuerId!==profile.issuerId||identity.membership.issuerKeyId!==profile.membershipKeyId)throw Error('This membership belongs to a different issuer. No provider connection approved.');
   frame(`<h3>Approve receiver policy</h3><p>Allow this session to review signed request credentials from the Zenith intake gateway. You will approve each action separately.</p><dl><dt>Browser origin</dt><dd>${e(profile.origin)}</dd><dt>Receiver</dt><dd>${e(profile.receiverIssuer)}</dd><dt>Audience</dt><dd>${e(profile.audience)}</dd><dt>Verification key</dt><dd class="wallet-key"><code>${e(profile.receiverPublicKey)}</code></dd></dl><p class="form-note">This approval ends when the Wallet locks or this page closes. No brief is sent by connecting.</p><button type="button" class="anima-button" data-tone="light" data-approve>Approve for this session</button>`);
   dialog.querySelector('[data-approve]')!.addEventListener('click',()=>void run(async()=>{await client.approveReceiver();close(embeddedServiceWallet(client,reviewEmbeddedPresentation));}));
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(!busy){void client.cancelPresentation();close(null);}});
  dialog.addEventListener('close',()=>{if(!finished)close(null);});
  frame('<p>Checking local Wallet…</p>');dialog.showModal();void run(show);
 });
}
export function reviewEmbeddedPresentation(preview:PresentationPreview):Promise<boolean>{
 const trigger=document.activeElement as HTMLElement|null,dialog=document.createElement('dialog'),s=preview.summary;
 dialog.className='service-panel wallet-connection';dialog.setAttribute('aria-labelledby','wallet-consent-title');
 // Every string is escaped, including signed issuer text. The Rust core verified
 // disclosure/credential/request digests before this preview became available.
 dialog.innerHTML=`<h2 id="wallet-consent-title" tabindex="-1">${e(s.disclosure.title)}</h2><ul>${s.disclosure.statements.map(text=>`<li>${e(text)}</li>`).join('')}</ul><dl><dt>From</dt><dd>${e(s.caller.id)}</dd><dt>To</dt><dd>${e(s.audience)}</dd><dt>Identity</dt><dd class="wallet-key"><code>${e(s.holder_public_key)}</code></dd><dt>Request digest</dt><dd class="wallet-key"><code>${e(s.request_digest_sha256)}</code></dd></dl><p class="form-note">Approval signs these exact bytes. It does not establish service admission or completion.</p><p data-expiry role="status"></p><div class="service-actions"><button class="anima-button" data-tone="light" data-approve>Approve this action</button><button class="anima-button" data-cancel>Cancel</button></div>`;
 document.body.append(dialog);
 return new Promise(resolve=>{let finished=false;const end=(approved:boolean)=>{if(finished)return;finished=true;clearInterval(timer);dialog.close();dialog.remove();trigger?.focus();resolve(approved);};const timer=setInterval(()=>{if(Date.now()/1000>=s.confirm_by)end(false);},250);
  dialog.querySelector('[data-approve]')!.addEventListener('click',()=>end(Date.now()/1000<s.confirm_by));dialog.querySelector('[data-cancel]')!.addEventListener('click',()=>end(false));dialog.addEventListener('cancel',event=>{event.preventDefault();end(false);});dialog.addEventListener('close',()=>end(false));
  dialog.querySelector('[data-expiry]')!.textContent='Approve before '+new Date(s.confirm_by*1000).toLocaleTimeString()+'.';dialog.showModal();dialog.querySelector<HTMLElement>('#wallet-consent-title')!.focus();dialog.scrollTop=0;
 });
}
