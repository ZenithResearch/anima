import {mountBrandQuestionFields} from './brand-question-fields.js';
import {exampleBrand} from './example-brand.js';
import {loadBrandPreview,saveBrandPreview} from './brand-preview-storage.js';
import type {BrandReferencesElement} from './brand-references.js';
import type {BrandReference} from './brand-references-model.js';
import {brandQuestions,emptyBrandPackage,readBrandPackage,answeredCount,requiredProgress,cardText,peopleDescriptions,missingBrandQuestions,brandPackageText,deliveryEmail,maySavePreview,BRAND_PREVIEW_KEY} from './brand-package-model.js';
// This review flow does not impersonate the Zenith account issuer or service delivery.
// The previously recovered workspace and browser databases remain untouched.
export function connectBusinessOnboarding():{destroy():void}{
 const panel=document.querySelector<HTMLDialogElement>('#business-start-panel');
 if(!panel)return {destroy(){}};
 const events=new AbortController(),options={signal:events.signal};
 const example=new URLSearchParams(location.search).get('brand-example')==='example';
 let draft=example?exampleBrand():emptyBrandPackage(),saved=false,requestReviewed=false,notifyByEmail=false,revision=0,loading=true,storageBlocked=false,showRequired=false;
 const previewScope=example?'zenith-experience-v3':panel.dataset.previewScope||'current';
 if(example){const note=document.createElement('p');note.className='brand-example-note';note.textContent='Example practice · local only';panel.querySelector('.intake-bar')!.insertBefore(note,panel.querySelector('.intake-close'));}
 const references=panel.querySelector<BrandReferencesElement>('anima-brand-references')!;
 const saveButton=panel.querySelector<HTMLButtonElement>('[data-save-brand-preview]')!;saveButton.disabled=true;
 const status=panel.querySelector<HTMLElement>('[data-workspace-status]')!;
 try{const raw=previewScope==='current'?localStorage.getItem(BRAND_PREVIEW_KEY):null;if(raw){const restored=readBrandPackage(JSON.parse(raw));if(restored){draft=restored;saved=true;}}}catch{}
 draft.promptSet='experience-v3';
 const fields=mountBrandQuestionFields(panel,()=>draft,()=>{revision++;requestReviewed=false;saved=false;renderWorkspace();});
 references.setDraft(draft.references||[],new Map(),draft.answers.references||'');
 references.addEventListener('anima:brand-references-change',event=>{draft.references=(event as CustomEvent<{references:BrandReference[]}>).detail.references;revision++;saved=false;requestReviewed=false;renderWorkspace();},options);
 function renderWorkspace():void {
  for(const {id} of brandQuestions){const text=cardText(draft,id).trim();const target=panel!.querySelector<HTMLElement>(`[data-preview-answer="${id}"]`)!;
   panel!.querySelector<HTMLElement>(`[data-package-answer="${id}"]`)!.textContent=id==='references'?[draft.answers.references?.trim(),...(draft.references||[]).map(ref=>ref.kind==='file'?ref.name:ref.url)].filter(Boolean).join('\n')||'Left open':id==='people'?peopleDescriptions(draft).map((text,i)=>`${i+1}. ${text}`).join('\n\n'):id==='feeling'?`In the body: ${draft.answers.body||'Left open'}\n\nEmotion: ${draft.answers.emotion||'Left open'}${draft.answers.feeling?'\n\nEarlier feeling response (retained): '+draft.answers.feeling:''}`:id==='world'?[draft.answers.world,draft.answers.signature?'Moments & rituals (existing or desired):\n'+draft.answers.signature:''].filter(Boolean).join('\n\n'):draft.answers[id]?.trim()||'Left open';
   const entry=panel!.querySelector<HTMLElement>(`[data-entry-answer="${id}"]`)!;
   entry.textContent=text?(text.length>80?text.slice(0,79)+'…':text):'Open to explore';
   const entryCard=entry.closest<HTMLAnchorElement>('a')!;
   entryCard.querySelector('.brand-piece-edit')!.textContent=text?'Edit ↗':showRequired?'Answer ↗':'Explore ↗';
   const incomplete=showRequired&&missingBrandQuestions(draft).includes(id);
   entryCard.dataset.incomplete=String(incomplete);
   if(incomplete)entryCard.setAttribute('aria-describedby','brand-required');else entryCard.removeAttribute('aria-describedby');
   const limit=matchMedia('(max-width:380px)').matches?14:80;
   target.textContent=text?(text.length>limit?text.slice(0,limit-1)+'…':text):'Open to explore';
   const card=target.closest('a')!;card.querySelector('.brand-piece-edit')!.textContent=text?'Edit ↗':'Explore ↗';
  }
  const missing=missingBrandQuestions(draft);
  panel!.querySelector('[data-brand-completion]')!.textContent=requiredProgress(draft);
  const required=panel!.querySelector<HTMLElement>('[data-brand-required]')!;
  required.hidden=!showRequired||!missing.length;
  required.textContent=missing.length?`Complete ${missing.length===1?'the remaining card':'the remaining '+missing.length+' cards'} to create your brand package.`:'';
  panel!.querySelector('[data-package-state]')!.textContent=requestReviewed?(notifyByEmail?'Email notification selected · not submitted':'Check workspace for delivery · not submitted'):'Not requested';

  status.textContent=`${requiredProgress(draft)}. ${loading?'Checking for a saved preview…':saved?'Answers, links and original files saved on this browser. Email is not saved.':'Kept in this tab until you save. Downloads list file references; keep originals here by saving.'} No account or package request has been created.`;
 }
 function route():void {
  const rawKey=location.hash.slice(1)||'business-start',key=rawKey==='brand-signature'?'brand-world':rawKey;
  const screen=panel!.querySelector<HTMLElement>(`[data-business-screen="${CSS.escape(key)}"]`);
  if(!screen)return;
  for(const item of panel!.querySelectorAll<HTMLElement>('[data-business-screen]'))item.hidden=item!==screen;
  const title=screen.querySelector<HTMLElement>('h2')!;panel!.setAttribute('aria-labelledby',title.id);
  panel!.dataset.businessView=key;panel!.scrollTop=0;renderWorkspace();
  if(panel!.open)title.focus({preventScroll:true});
 }
 function requireBrandQuestions():boolean {
  const missing=missingBrandQuestions(draft);if(!missing.length){showRequired=false;renderWorkspace();return true;}
  showRequired=true;renderWorkspace();location.hash='business-start';
  const first=panel!.querySelector<HTMLAnchorElement>(`[data-brand-question-card="${missing[0]}"]`)!;
  requestAnimationFrame(()=>first.focus({preventScroll:true}));return false;
 }
 panel.querySelector('[data-create-brand-package]')!.addEventListener('click',()=>{if(requireBrandQuestions())location.hash='brand-account';},options);
 panel.querySelector('[data-zenith-account]')!.addEventListener('click',()=>{
  const note=panel.querySelector<HTMLElement>('[data-account-status]')!;
  note.textContent='The shared Zenith web account connection is not configured in this local preview. No account has been created. Your completed answers remain here. You can review delivery without signing in; no request will be sent.';
 },options);
 const delivery=panel.querySelector<HTMLFormElement>('#business-delivery')!,email=delivery.querySelector<HTMLInputElement>('input')!,error=delivery.querySelector<HTMLElement>('[data-delivery-error]')!;
 email.addEventListener('input',()=>{error.hidden=true;email.removeAttribute('aria-invalid');requestReviewed=false;},options);
 delivery.addEventListener('submit',event=>{
  event.preventDefault();if(!requireBrandQuestions())return;if(email.value.trim()&&!deliveryEmail(email.value)){error.textContent='Check the email address, or leave it blank to check back here instead.';error.hidden=false;email.setAttribute('aria-invalid','true');email.focus();return;}
  email.removeAttribute('aria-invalid');error.hidden=true;requestReviewed=true;notifyByEmail=Boolean(email.value.trim());
  // A local preview may show the entered material, but never claim queued generation or email delivery.
  location.hash='brand-workspace';renderWorkspace();
 },options);
 async function restoreSaved():Promise<void>{
  try{
   const record=await loadBrandPreview(previewScope);
   if(record){const restored=readBrandPackage(record.raw);if(!restored){storageBlocked=true;status.textContent='An incompatible saved preview is here. It has not been changed.';}else if(revision===0){draft=restored;draft.promptSet='experience-v3';saved=true;fields.sync();references.setDraft(draft.references||[],record.files,draft.answers.references||'');}}
  }catch{/* Keep the legacy answers and current in-tab files when browser storage is unavailable. */}
  loading=false;saveButton.disabled=false;renderWorkspace();
 }
 saveButton.addEventListener('click',async()=>{
  if(loading||saveButton.disabled)return;
  try{
   const existing=previewScope==='current'?localStorage.getItem(BRAND_PREVIEW_KEY):null;
   if(storageBlocked||!maySavePreview(existing)){status.textContent='An incompatible saved draft is already here. Download these answers instead; the existing draft was not changed.';return;}
   const snapshot=readBrandPackage(draft)!,atRevision=revision;saveButton.disabled=true;
   await saveBrandPreview(snapshot,references.getFiles(),previewScope);saved=revision===atRevision;renderWorkspace();
   if(!saved)status.textContent='The saved snapshot is safe. You have newer edits here; save again to include them.';
  }catch(error){status.textContent=error instanceof Error?error.message:'Browser saving is unavailable. Your answers and files are still here; your previous save is unchanged.';}
  finally{saveButton.disabled=false;}
 },options);
 panel.querySelector('[data-export-brand-preview]')!.addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([brandPackageText(draft)],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='anima-brand-inputs.txt';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 },options);
 window.addEventListener('resize',renderWorkspace,options);
 window.addEventListener('hashchange',route,options);window.addEventListener('popstate',route,options);
 route();void restoreSaved();return {destroy(){fields.destroy();events.abort();}};
}
