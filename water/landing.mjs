import {WaterBackdrop} from './backdrop.mjs';
import {connectMotion} from './motion.mjs';
import {SCOPE,normalizeDraft,validateDraft,enterDraft,loadDraft,saveDraft,clearDraft,earlierDrafts,exportDraft,nextTab,projectEmail,introductionEmail} from './landing-model.mjs';
import {roles} from './network-copy.mjs';
import {OPPORTUNITY_OPTIONS,OPPORTUNITY_ERROR} from './talent-opportunities.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],events=new AbortController(),options={signal:events.signal};
const on=(node,event,fn)=>node.addEventListener(event,fn,options);
const water=new WaterBackdrop($('#presence'));
export {water};
if(new URLSearchParams(location.search).get('water')==='still')water.setFallback(true);
const liveWater=water.ready&&!water.forcedFallback;
const motion=connectMotion(liveWater?$('#motion'):null,{renderer:liveWater?water:null});
if(!liveWater){water.setQuiet(true);$('#motion').disabled=true;$('#motion').setAttribute('aria-pressed','false');}

// Native modal navigation supplies focus containment; every action is also in the footer.
const menu=$('#mobile-menu'),menuButton=$('#menu-toggle');let navigatingMenu=false;
on(menuButton,'click',()=>{navigatingMenu=false;menu.showModal();menuButton.setAttribute('aria-expanded','true');});
on($('#menu-close'),'click',()=>menu.close());
on(menu,'close',()=>{menuButton.setAttribute('aria-expanded','false');if(!navigatingMenu)menuButton.focus({preventScroll:true});navigatingMenu=false;});
on(menu,'click',e=>{if(e.target.closest('a')){navigatingMenu=true;menu.close();}});

// Keep the source's client/creator process, with independently retained introduction forms.
let role='client',step=0,introRole='creator';
const processElement=$('anima-process'),nativeProcess=typeof processElement?.selectRole==='function'?processElement:null;
function setIntroRole(value){
 introRole=value;
 $$('[data-intro-role]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.introRole===value)));
 $$('[data-intro-form]').forEach(form=>{form.hidden=form.dataset.introForm!==value;});
 const introductions={
  creator:['Show us your work.','Independent creatives and studios: show us the work you want to make more of, and how you like to collaborate. Every proposed project comes with a brief and terms to consider.'],
  talent:['Join the talent roster.','Models, actors, performers and voice artists: choose the screen, print, digital/social, audio or live work you want. Your profile can stay private. If you’re represented, include your agent or manager’s booking contact.'],
  client:[$('#introduction').dataset.clientTitle||'Begin with the business question.',$('#introduction').dataset.clientCopy||'Tell us about the organization, audience and desired effect. We’ll shape the scope together and decide whether creator collaboration belongs in it.']
 };
 $('#introduction-title').textContent=introductions[value][0];$('#introduction-copy').textContent=introductions[value][1];
 $('#introduction-receipt').hidden=true;
}
function renderStep(){
 const data=roles[role].steps[step];
 $$('.step-tabs button').forEach((button,i)=>{button.setAttribute('aria-selected',String(i===step));button.tabIndex=i===step?0:-1;});
 $('#step-panel').setAttribute('aria-labelledby',`step-${step}`);
 $('#step-count').textContent=`${String(step+1).padStart(2,'0')} / ${String(roles[role].steps.length).padStart(2,'0')}`;
 $('#step-title').textContent=data.title;$('#step-copy').textContent=data.copy;$('#step-outcome').textContent=data.outcome;
 $('#step-prompts').replaceChildren(...data.prompts.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
}
function setRole(value){
 role=value;step=0;
 if(nativeProcess){nativeProcess.selectRole(value);return;}
 $$('[data-role]').forEach(button=>{const active=button.dataset.role===role;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
 $('#role-panel').setAttribute('aria-labelledby',`role-${role}`);
 $('#role-title').textContent=roles[role].title;$('#role-intro').textContent=roles[role].intro;
 const tabs=roles[role].steps.map((data,i)=>{
  const button=document.createElement('button');button.type='button';button.id=`step-${i}`;button.setAttribute('role','tab');button.setAttribute('aria-controls','step-panel');button.textContent=`${i+1}. ${data.verb}`;
  on(button,'click',()=>{step=i;renderStep();});on(button,'keydown',e=>{const next=nextTab(e.key,i,roles[role].steps.length);if(next===null)return;e.preventDefault();step=next;renderStep();$$('.step-tabs button')[next].focus();});return button;
 });
 $('.step-tabs').replaceChildren(...tabs);renderStep();
}
if(!nativeProcess)$$('[data-role]').forEach((button,i)=>{
 on(button,'click',()=>{setRole(button.dataset.role);setIntroRole(button.dataset.role);});
 on(button,'keydown',e=>{const next=nextTab(e.key,i,2);if(next===null)return;e.preventDefault();const target=$$('[data-role]')[next];setRole(target.dataset.role);setIntroRole(target.dataset.role);target.focus();});
});
if(nativeProcess)on(nativeProcess,'anima:process-role-change',event=>setIntroRole(event.detail.role));
$$('[data-intro-role]').forEach(button=>on(button,'click',()=>setIntroRole(button.dataset.introRole)));
$$('[data-role-entry]').forEach(link=>on(link,'click',()=>{const value=link.dataset.roleEntry;if(roles[value])setRole(value);setIntroRole(value);}));
$$('[data-find-creators]').forEach(link=>on(link,'click',()=>{$('#creator-path').open=true;setRole('client');}));
let receiptActions=new AbortController();events.signal.addEventListener('abort',()=>receiptActions.abort(),{once:true});
$$('[data-intro-form]').forEach(form=>{
 on(form,'input',e=>{e.target.setCustomValidity?.('');$('#introduction-receipt').hidden=true;});
 on(form,'submit',e=>{
  e.preventDefault();
  if(form.dataset.introForm==='talent'){
   const picker=form.querySelector('anima-opportunities');
   if(typeof picker?.validate==='function')picker.validate();
   else {const first=form.querySelector('.talent-opportunities input[type=checkbox]');const selected=OPPORTUNITY_OPTIONS.some(option=>form.elements.namedItem(option.key)?.checked);first?.setCustomValidity(selected?'':OPPORTUNITY_ERROR);}
   const portfolio=form.querySelector('anima-talent-portfolio');
   if(typeof portfolio?.validate==='function')portfolio.validate();
  }
  for(const field of form.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not(:disabled),textarea:not(:disabled)'))if(field.required&&!field.value.trim()){field.setCustomValidity('Add a little context here.');field.reportValidity();return;}
  if(!form.reportValidity())return;
  receiptActions.abort();receiptActions=new AbortController();
  const receipt=$('#introduction-receipt'),message=document.createElement('p'),link=document.createElement('a');
  message.textContent=form.dataset.introForm==='talent'?'Your roster request is ready. Nothing has been sent or published. Open the prepared email, review your details and preferences, then choose whether to send.':'Your note is ready. Nothing has been sent or stored. Open the prepared email, review it, then choose whether to send.';
  try{link.href=introductionEmail(form.dataset.introForm,Object.fromEntries(new FormData(form)));}
  catch(error){message.textContent=error.message||'Review the work links and their associations before preparing this note.';receipt.replaceChildren(message);receipt.hidden=false;receipt.focus();return;}
  link.textContent='Open email with this note ↗';link.className='text-link';const fallback=document.createElement('p');fallback.className='mail-fallback';fallback.textContent='If your email app doesn’t open, copy your details and email anima@zenith-research.ca.';receipt.replaceChildren(message,link,fallback);receipt.hidden=false;receipt.focus();
  if(form.dataset.introForm==='talent'){
   const body=new URL(link.href).searchParams.get('body')||'',review=document.createElement('details'),label=document.createElement('summary'),text=document.createElement('pre'),copy=document.createElement('button'),download=document.createElement('button');
   label.textContent='Review your complete roster request';text.textContent=body;review.className='roster-request-review';review.append(label,text);
   copy.type='button';copy.className='text-link';copy.textContent='Copy roster request';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(body);copy.textContent='Roster request copied';}catch{copy.textContent='Copy unavailable — download the request instead';}},{signal:receiptActions.signal});
   download.type='button';download.className='text-link';download.textContent='Download roster request';download.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'})),anchor=document.createElement('a');anchor.href=url;anchor.download='anima-talent-roster-request.txt';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},{signal:receiptActions.signal});
   fallback.textContent='For a longer request, copy or download the complete note if your email app cannot open it.';receipt.append(review,copy,download);
  }
 });
});
const talentForm=$('#talent-introduction');
on(talentForm.elements.representation,'change',()=>{
 const represented=talentForm.elements.representation.value==='represented',fields=$('#talent-agent-fields');
 fields.hidden=!represented;fields.disabled=!represented;
});
for(const input of talentForm.querySelectorAll('.talent-opportunities input[type=checkbox]'))on(input,'change',()=>talentForm.querySelector('.talent-opportunities input[type=checkbox]')?.setCustomValidity(''));
setRole('client');setIntroRole('creator');

// All storage access is explicit and guarded, including browsers that reject the getter.
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)};
const form=$('#project-form'),status=$('#draft-status');let touched=false,errorsVisible=false,savedRecord=null;
function read(){return normalizeDraft({brand:form.elements.brand.value,scope:form.elements.scope.value,outcome:form.elements.outcome.value,audience:form.elements.audience.value,context:form.elements.context.value,creatorInterest:form.elements.creatorInterest.checked,naming:form.elements.naming.checked});}
function fill(draft){
 const d=normalizeDraft(draft);for(const key of ['brand','scope','outcome','audience','context'])form.elements[key].value=d[key];
 form.elements.creatorInterest.checked=d.creatorInterest;form.elements.naming.checked=d.naming;contextNote();
}
function contextNote(){$('#entry-context').textContent=read().creatorInterest?'This outline includes finding creative collaborators.':'';}
function field(key){return key==='scope'?form.querySelector('[name=scope]'):form.elements[key];}
function setErrors(show){
 const errors=validateDraft(read()),summary=$('#error-summary');
 for(const key of ['brand','scope','outcome','audience']){
  const error=errors.find(e=>e.key===key),invalid=!!(show&&error),note=$(`#${key}-error`);note.hidden=!invalid;note.textContent=invalid?error.message:'';
  (key==='scope'?[...form.querySelectorAll('[name=scope]')]:[field(key)]).forEach(input=>input.setAttribute('aria-invalid',String(invalid)));
 }
 summary.hidden=!show||!errors.length;
 summary.querySelector('ul').replaceChildren(...(show?errors:[]).map(error=>{
  const li=document.createElement('li'),a=document.createElement('a');a.href=`#${error.key==='scope'?'scope-field':error.key}`;a.textContent=error.message;on(a,'click',e=>{e.preventDefault();field(error.key).focus();});li.append(a);return li;
 }));return errors;
}
function renderReview(){
 const d=read(),rows=[['Your brand or project',d.brand],['What we’re making',SCOPE[d.scope]],['What you want to make happen',d.outcome],['Who you want to reach',d.audience],['What we can start from',d.context||'A conversation to have together.'],['Creative collaborators',d.creatorInterest?'Yes, help us find the right people.':'Not part of this outline.'],['Naming',d.naming?'Include naming in the exploration.':'Not part of this outline.']];
 $('#project-email').href=projectEmail(d);
 $('#project-recap').replaceChildren(...rows.map(([key,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;row.append(dt,dd);return row;}));
}
function focusSection(target){target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
function route({initial=false}={}){
 if(location.hash==='#project-review'){
  if(validateDraft(read()).length){history.replaceState(null,'','#capture');form.hidden=false;$('#project-review').hidden=true;if(!initial){errorsVisible=true;setErrors(true);focusSection($('#error-summary'));}else focusSection($('#capture'));return;}
  renderReview();form.hidden=true;$('#project-review').hidden=false;focusSection($('#project-review'));
 }else{
  form.hidden=false;$('#project-review').hidden=true;
  if(location.hash==='#capture')focusSection($('#capture'));
 }
}
function go(hash){if(location.hash===hash)route();else location.hash=hash;}
on(form,'input',()=>{touched=true;status.textContent='Changes are kept for this visit. Choose Save to keep them after reloading.';contextNote();if(errorsVisible)setErrors(true);});
on(form,'change',()=>{touched=true;contextNote();if(errorsVisible)setErrors(true);});
on(form,'submit',e=>{e.preventDefault();errorsVisible=true;if(setErrors(true).length){focusSection($('#error-summary'));return;}go('#project-review');});
$$('[data-entry]').forEach(link=>on(link,'click',e=>{e.preventDefault();fill(enterDraft(read(),link.dataset.entry,touched));setRole('client');go('#capture');}));
$$('[data-save]').forEach(button=>on(button,'click',()=>{
 const result=saveDraft(storage,read());savedRecord=result.stored?result.record:null;touched=true;
 status.textContent=result.stored?'Outline saved in this browser. Nothing has been sent.':'This browser could not save the outline. Your writing is still here; download it before leaving. Nothing has been sent.';
}));
$$('[data-download]').forEach(button=>on(button,'click',()=>{
 const data=exportDraft(read(),savedRecord),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='anima-project-outline.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Outline downloaded. Nothing has been sent.';
}));
$$('[data-clear]').forEach(button=>on(button,'click',()=>{
 const removed=clearDraft(storage);form.reset();savedRecord=null;touched=false;errorsVisible=false;setErrors(false);contextNote();$('#project-recap').replaceChildren();
 status.textContent=removed?'Draft cleared here and from this browser. Earlier outlines remain untouched.':'Writing cleared here. Browser storage could not be changed; a saved draft may return after reload.';go('#capture');
}));
const restored=loadDraft(storage);
if(restored){fill(restored.draft);touched=true;savedRecord={...restored.draft,savedAt:restored.savedAt};status.textContent='Your saved outline is here. Nothing has been sent.';}
for(const earlier of earlierDrafts(storage)){
 $('#earlier-drafts').hidden=false;const button=document.createElement('button');button.type='button';button.textContent=`Import ${earlier.label.toLowerCase()}`;
 on(button,'click',()=>{fill(earlier.draft);touched=true;errorsVisible=false;setErrors(false);status.textContent='An earlier outline was copied into this form. The original is unchanged. Review the fields, then save when ready.';go('#capture');});$('#earlier-list').append(button);
}
setErrors(false);route({initial:true});on(window,'hashchange',()=>route());
$$('[data-js]').forEach(button=>button.disabled=false);
on(window,'pagehide',e=>{if(e.persisted)water.cancel();else{events.abort();motion.destroy();water.destroy();}});
on(window,'pageshow',e=>{if(e.persisted){motion.sync();water.request();}});
