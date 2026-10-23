import {brandQuestions} from './brand-package-model.js';
import {navigationEntry,navigationState,canNavigateBack} from './navigation-history.js';
const intakeHashes=new Set(['#introduction','#capture','#project-review','#character','#business-start','#brand-account','#brand-feeling','#brand-people','#brand-world','#brand-signature','#brand-references','#brand-delivery','#brand-workspace','#brand-package','#talent-start',...brandQuestions.map(q=>'#brand-'+q.id)]);
// Route-owned native dialogs: inputs stay mounted while the pond stays in place.
// The existing intake controller still owns validation, drafts and local receipts.
export function connectIntakePanels():{destroy():void} {
 const intro=document.querySelector<HTMLDialogElement>('#introduction-panel')!;
 const project=document.querySelector<HTMLDialogElement>('#project-panel')!;
 const character=document.querySelector<HTMLDialogElement>('#character-panel')!;
 const businessStart=document.querySelector<HTMLDialogElement>('#business-start-panel')!;
 const talentStart=document.querySelector<HTMLDialogElement>('#talent-start-panel')!;
 const menu=document.querySelector<HTMLDialogElement>('#mobile-menu')!,menuButton=document.querySelector<HTMLButtonElement>('#menu-toggle')!;
 const dialogs=[intro,project,character,businessStart,talentStart],events=new AbortController(),options={signal:events.signal};
 let current:HTMLDialogElement|null=null,opener:HTMLElement|null=null;
 let returnHash=intakeHashes.has(location.hash)?'#water':location.hash;
 let returnScroll=scrollY,observedHref=location.href;
 // Seed a direct entry without inventing a predecessor. Reload keeps known history.
 if(navigationEntry(history.state)?.href!==location.href)history.replaceState(navigationState(history.state,location.href,null),'');
 function push(hash:string):void {
  const previous=location.href,next=new URL(hash,location.href).href;
  history.pushState(navigationState(history.state,next,previous),'',next);
 }
 function back():void {
  if(canNavigateBack(history.state,location.href)){history.back();return;}
  // A same-origin previous page can be a real page, not an intake route.
  try{if(history.length>1&&new URL(document.referrer).origin===location.origin){history.back();return;}}catch{}
  close();
 }
 function restoreFocus():void {
  window.scrollTo({top:returnScroll,behavior:'instant'});
  const hiddenMenuOpener=opener?.closest('dialog')===menu&&!menu.open;
  (hiddenMenuOpener?menuButton:opener?.isConnected?opener:document.querySelector<HTMLElement>('.site-header .wordmark'))?.focus({preventScroll:true});
 }
 function sync():void {
  // Hash navigation from the retained form controller creates its own entry.
  // Record its predecessor too; Back/Forward entries already have matching metadata.
  if(location.href!==observedHref){
   if(navigationEntry(history.state)?.href!==location.href)history.replaceState(navigationState(history.state,location.href,observedHref),'');
   observedHref=location.href;
  }
  const next=(location.hash==='#business-start'||location.hash.startsWith('#brand-')&&intakeHashes.has(location.hash))?businessStart:location.hash==='#talent-start'?talentStart:location.hash==='#character'?character:location.hash==='#introduction'?intro:(location.hash==='#capture'||location.hash==='#project-review'?project:null);
  if(current===next)return;
  const previous=current;current=next;
  for(const dialog of dialogs)if(dialog!==next&&dialog.open)dialog.close();
  if(next&&!next.open)next.showModal();
  if(!next&&previous){
   if(navigationEntry(history.state)?.menu&&!menu.open){menu.showModal();menuButton.setAttribute('aria-expanded','true');}
   restoreFocus();
  }
  document.documentElement.dataset.intake=next===intro?'introduction':next===project?'project':next===character?'character':next===businessStart?'business-start':next===talentStart?'talent-start':'closed';
 }
 function close():void {
  if(!current)return;
  // Close is a return, not a new navigation entry. Browser Back/Forward still
  // traverses edit/review routes; unsent inputs remain in their original forms.
  const href=new URL(location.pathname+location.search+returnHash,location.href).href;
  history.replaceState(navigationState(history.state,href,null),'',href);
  sync();window.dispatchEvent(new HashChangeEvent('hashchange'));
 }
 document.addEventListener('click',event=>{
  const link=(event.target as Element).closest<HTMLAnchorElement>('a[href]');
  if(!link)return;
  const mouse=event as MouseEvent;
  if(mouse.button||mouse.metaKey||mouse.ctrlKey||mouse.altKey||mouse.shiftKey)return;
  if(current&&link.hasAttribute('data-intake-exit')){
   const hash=link.getAttribute('href')||'',target=hash.startsWith('#')?document.getElementById(hash.slice(1)):null;
   if(!target)return;
   if(hash==='#reflection'){const kind=character.querySelector<HTMLElement>('anima-character')?.dataset.kind;document.querySelector<HTMLElement & {selectPerspective(view:'business'|'talent'):void}>('anima-reflection')?.selectPerspective(kind==='icp'?'business':'talent');}
   event.preventDefault();push(hash);sync();window.dispatchEvent(new HashChangeEvent('hashchange'));target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;
  }
  if(!intakeHashes.has(link.getAttribute('href')||''))return;
  if(!current){opener=link;returnHash=location.hash;returnScroll=scrollY;
   if(menu.open){const entry=navigationEntry(history.state);history.replaceState(navigationState(history.state,location.href,entry?.previous??null,true),'');}
  }
  event.preventDefault();
  const hash=link.getAttribute('href')!;
  const role=link.dataset.characterEntry;
  const builder=character.querySelector<HTMLElement & {selectRole(role:'icp'|'creator'):void;selectKind(kind:'talent'):void}>('anima-character');
  if(role==='talent')builder?.selectKind('talent');else if(role==='icp'||role==='creator')builder?.selectRole(role);
  if(location.hash!==hash)push(hash);
  sync();window.dispatchEvent(new HashChangeEvent('hashchange'));
 },{...options,capture:true});
 menu.addEventListener('close',()=>{
  const entry=navigationEntry(history.state);
  if(entry?.menu)history.replaceState(navigationState(history.state,location.href,entry.previous),'');
 },options);
 menu.querySelector('[data-menu-back]')!.addEventListener('click',()=>menu.close(),options);
 for(const dialog of dialogs){
  dialog.querySelector('[data-intake-back]')!.addEventListener('click',back,options);
  dialog.querySelector('[data-intake-close]')!.addEventListener('click',close,options);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();},options);
 }
 window.addEventListener('hashchange',sync,options);
 window.addEventListener('popstate',sync,options);
 sync();
 return {destroy(){events.abort();for(const dialog of dialogs)if(dialog.open)dialog.close();}};
}
