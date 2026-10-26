import {connectEmbeddedWallet} from './embedded-wallet-connection.js';
import {createEmbeddedWalletClient} from './embedded-wallet-client.js';
import type {LocalWalletState,WalletPreview} from './embedded-wallet-host.js';
import {escape as e} from './page.js';
import {renderWalletImportReview} from './wallet-import-review.js';
const root=document.querySelector<HTMLElement>('#wallet-content')!,notice=document.querySelector<HTMLElement>('#wallet-notice')!;
const client=createEmbeddedWalletClient();
let state:LocalWalletState,preview:WalletPreview|null=null,busy=false,tab='create';
const field=(name:string,label:string,confirm=false)=>`<label class="anima-field" data-density="compact"><span>${e(label)}</span><input class="anima-control" name="${name}" type="password" autocomplete="${confirm?'new-password':'current-password'}" required maxlength="4096"${confirm?' minlength="12"':''}></label>`;
const fileField=()=>'<label class="anima-field" data-density="compact"><span>Encrypted recovery file</span><input class="anima-control" name="file" type="file" accept=".castalia-recovery,application/json" required></label>';
function render(){
 if(preview){root.innerHTML=renderWalletImportReview(preview);return;}
 if(!state.configured){root.innerHTML=`<section class="service-panel"><h2>Your Wallet, here</h2><p>Create a local identity or restore your encrypted Castalia recovery file. No extension or app download is needed.</p><div class="service-actions" role="group" aria-label="Set up Wallet"><button class="anima-button" data-tab="create" aria-pressed="${tab==='create'}">Create Wallet</button><button class="anima-button" data-tab="restore" aria-pressed="${tab==='restore'}">Restore Wallet</button></div><form data-form="${tab}">${tab==='restore'?fileField()+field('filePassword','Recovery file password'):''}${field('password',tab==='restore'?'New browser password':'Browser password',true)}${field('confirm','Confirm browser password',true)}<p class="form-note">At least 12 characters. Keep your password somewhere safe; an email login cannot recover these keys.</p><button class="anima-button" data-tone="light" type="submit">Review ${tab==='restore'?'restored':'new'} identity</button></form></section>`;return;}
 if(!state.unlocked){root.innerHTML=`<section class="service-panel"><h2>Unlock Wallet</h2><p>Your encrypted identity is saved in this browser.</p><form data-form="unlock">${field('password','Browser password')}<button class="anima-button" data-tone="light" type="submit">Unlock</button></form></section>`;return;}
 root.innerHTML=`<section class="service-panel"><div class="wallet-heading"><h2>Local Wallet</h2><button class="anima-button" data-action="lock">Lock</button></div><p class="wallet-key"><code>${e(state.public_key||'')}</code></p><p role="status">${state.backup_verified?'Recovery file tested.':'Save and test a recovery file.'}</p><p class="form-note">Local identity available. Membership, account authentication and service submission are not connected here.</p></section><section class="service-panel"><h2>Save your recovery file</h2><p>Choose a password for the encrypted file. Save <code>Castalia-Recovery-YYYY-MM-DD.castalia-recovery</code> in a folder you back up—for example, Documents / Castalia Backups.</p><form data-form="export">${field('password','Recovery file password',true)}${field('confirm','Confirm recovery file password',true)}<button class="anima-button" type="submit">Download encrypted recovery file</button></form><p class="form-note">This file restores your signing identity and derived blockchain accounts. Saved account identities, profile and membership proofs belong in a separate Castaway data backup; this Anima screen does not import or export that file. It does not include Anima drafts, uploaded originals, active sessions, provider trust or access permissions. Browser storage is specific to this site; the file lets you restore the same identity elsewhere.</p></section><section class="service-panel"><h2>Test your saved file</h2><p>Select the downloaded file and enter its password. The Wallet checks that it restores this exact identity without replacing it.</p><form data-form="verify">${fileField()}${field('password','Recovery file password')}<button class="anima-button" type="submit">Test recovery file</button></form><details><summary>Restore on another device</summary><p>Open the Wallet there, choose Restore Wallet, select your <code>.castalia-recovery</code> file, enter its file password and choose a new browser password. Review the Wallet public key and derived blockchain accounts before saving. An installed identity is never replaced by this screen.</p></details></section>`;
}
async function act(task:()=>Promise<void>,message=''){
 if(busy)return;busy=true;notice.textContent='Working locally…';root.setAttribute('aria-busy','true');root.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=true);
 try{await task();notice.textContent=message;render();}
 catch(error){preview=null;notice.textContent=error instanceof Error?error.message:'Wallet unavailable.';try{state=await client.state();render();}catch{/* Keep current page; do not create a replacement identity. */}}
 finally{busy=false;root.setAttribute('aria-busy','false');root.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=false);(preview?root.querySelector<HTMLElement>('#wallet-review-title'):notice)?.focus();}
}
root.addEventListener('click',event=>{
 const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button||busy)return;
 if(button.dataset.tab){tab=button.dataset.tab;render();root.querySelector<HTMLButtonElement>(`button[data-tab="${tab}"]`)?.focus();return;}
 const action=button.dataset.action;
 if(action==='confirm')void act(async()=>{state=await client.confirm();preview=null;},'Encrypted Wallet saved locally. Nothing sent.');
 if(action==='cancel')void act(async()=>{state=await client.cancel();preview=null;},'Cancelled. No identity saved.');
 if(action==='lock')void act(async()=>{state=await client.lock();},'Wallet locked.');
});
root.addEventListener('submit',event=>{
 event.preventDefault();if(busy)return;const form=event.target as HTMLFormElement;if(!form.reportValidity())return;
 const data=new FormData(form),kind=form.dataset.form,password=String(data.get('password')||'');
 const confirm=form.elements.namedItem('confirm') as HTMLInputElement|null;
 if(confirm&&password!==confirm.value){confirm.setCustomValidity('The passwords must match.');confirm.reportValidity();confirm.oninput=()=>confirm.setCustomValidity('');return;}
 const file=data.get('file');
 if(file instanceof File&&file.size>1_048_576){notice.textContent='Choose a recovery file smaller than 1 MiB.';return;}
 // Clear visible secrets before the asynchronous worker call. No form values
 // enter logs, URL, cookies, analytics, localStorage or Anima draft records.
 form.reset();void act(async()=>{
  if(kind==='create')preview=await client.create(password);
  else if(kind==='restore'){if(!(file instanceof File))throw Error('Choose a recovery file.');preview=await client.restore(await file.text(),String(data.get('filePassword')||''),password);}
  else if(kind==='unlock')state=await client.unlock(password);
  else if(kind==='verify'){if(!(file instanceof File))throw Error('Choose a recovery file.');state=await client.verify(await file.text(),password);}
  else if(kind==='export'){
   const backup=await client.export(password);if(backup.extension!=='castalia-recovery')throw Error('Unsupported recovery file.');
   const url=URL.createObjectURL(new Blob([backup.file],{type:'application/json'})),link=document.createElement('a');
   link.href=url;link.download=`Castalia-Recovery-${new Date().toISOString().slice(0,10)}.castalia-recovery`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);
  }
 },kind==='export'?'Download requested. Select the saved file below to test recovery.':kind==='verify'?'Saved recovery file verified against this identity.':'Nothing sent.');
});
window.addEventListener('pagehide',()=>client.destroy(),{once:true});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
void act(async()=>{state=await client.state();},'Local Wallet candidate. No provider connected.');

document.querySelector('#review-wallet-connection')?.addEventListener('click',async()=>{
 const connected=await connectEmbeddedWallet(client);
 document.querySelector('#wallet-provider-state')!.textContent=connected?'Membership verified; receiver policy approved for this session. No service request sent.':'Provider not connected. Local Wallet unchanged.';
 if(connected){state=await client.state();render();}
});
