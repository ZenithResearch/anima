import {answerFields,peopleDescriptions,setPeople,MAX_PEOPLE,type BrandPackageDraft,type BrandQuestionId,type BrandAnswerId} from './brand-package-model.js';
const e=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function brandQuestionFields(id:BrandQuestionId,draft:BrandPackageDraft,prefix='brand'):string{
 const field=(key:typeof answerFields[number]['id'])=>{const f=answerFields.find(f=>f.id===key)!;return `<label class="brand-answer-label" for="${prefix}-answer-${key}">${e(f.prompt)}${!f.required?' <small>Optional</small>':''}</label><textarea id="${prefix}-answer-${key}" data-brand-answer="${key}" name="brief-${key}" aria-label="${e(f.prompt)}" aria-required="${f.required}" rows="3" maxlength="4000" placeholder="${e(f.placeholder)}">${e(draft.answers[key]||'')}</textarea>`;};
 if(id==='people')return `<div class="people-editor" data-people-editor><div class="people-toolbar"><div class="people-orbit" role="group" aria-label="People descriptions" data-people-list></div><button type="button" class="people-add" data-people-add aria-label="Add a people description">＋</button></div><div class="people-caption"><label for="${prefix}-answer-people" data-people-label>Description 1</label><span data-people-count>1 of 7</span><button type="button" class="people-remove" data-people-remove aria-label="Remove this description">Remove</button></div><textarea id="${prefix}-answer-people" data-people-text aria-label="People description 1" rows="5" maxlength="4000" placeholder="Describe this type of person and a moment in their life…"></textarea><p class="people-feedback" role="status" aria-live="polite"><span data-people-status>Plain descriptions. Character profiles come later.</span> <button type="button" data-people-undo hidden>Undo remove</button></p></div>`;
 if(id==='feeling')return `<div class="brand-answer-stack">${field('body')}${field('emotion')}<details class="brand-earlier" data-earlier-feeling ${draft.answers.feeling?'':'hidden'}><summary>Earlier feeling response</summary><p data-earlier-feeling-text>${e(draft.answers.feeling||'')}</p><small>Retained as context; it has not been split into new answers.</small></details></div>`;
 if(id==='world')return `<div class="brand-answer-stack">${field('world')}<details class="brand-moments" ${draft.answers.signature?'open':''}><summary>Moments & rituals <small>Optional</small></summary><p>These can already exist, or be something you would like to introduce.</p>${field('signature')}<p class="business-small" data-legacy-feeling ${draft.answers.signature&&!draft.promptSet?'':'hidden'}>An earlier response is retained as context.</p></details></div>`;
 return `<div class="brand-answer-stack">${field('brand')}</div>`;
}
export function mountBrandQuestionFields(root:HTMLElement,getDraft:()=>BrandPackageDraft,changed:()=>void):{sync():void;destroy():void}{
 const abort=new AbortController(),options={signal:abort.signal};let active=0,undo:{text:string;index:number}|undefined;
 const people=root.querySelector<HTMLElement>('[data-people-editor]');
 const get=<T extends HTMLElement>(s:string)=>people!.querySelector<T>(s)!;
 function syncPeople(focus=false):void{
  if(!people)return;const entries=peopleDescriptions(getDraft());active=Math.min(active,entries.length-1);
  const list=get('[data-people-list]');list.innerHTML=entries.map((text,i)=>`<button type="button" class="people-avatar" data-person="${i}" aria-pressed="${i===active}" aria-label="Edit description ${i+1}${text.trim()?': '+e(text.trim().slice(0,70)):', empty'}" title="Description ${i+1}"><span aria-hidden="true">${String(i+1).padStart(2,'0')}</span></button>`).join('');
  get<HTMLTextAreaElement>('[data-people-text]').value=entries[active]||'';
  get('[data-people-label]').textContent=`Description ${active+1}`;get<HTMLTextAreaElement>('[data-people-text]').setAttribute('aria-label',`People description ${active+1}`);
  get('[data-people-count]').textContent=`${entries.length} of ${MAX_PEOPLE}`;get<HTMLButtonElement>('[data-people-add]').disabled=entries.length>=MAX_PEOPLE;
  get<HTMLButtonElement>('[data-people-remove]').disabled=entries.length===1;
  get('[data-people-undo]').hidden=!undo;get<HTMLButtonElement>('[data-people-undo]').disabled=entries.length>=MAX_PEOPLE;
  if(focus)get<HTMLTextAreaElement>('[data-people-text]').focus({preventScroll:true});
 }
 function updatePeople(entries:string[]):void{const draft=getDraft();setPeople(draft,entries);draft.promptSet='experience-v3';changed();}
 people?.addEventListener('click',event=>{
  const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button)return;
  if(button.dataset.person!==undefined){active=Number(button.dataset.person);syncPeople(true);return;}
  const entries=peopleDescriptions(getDraft());
  if(button.hasAttribute('data-people-add')&&entries.length<MAX_PEOPLE){entries.push('');active=entries.length-1;updatePeople(entries);syncPeople(true);get('[data-people-status]').textContent=`Description ${active+1} added.`;}
  if(button.hasAttribute('data-people-remove')&&entries.length>1){undo={text:entries[active]!,index:active};entries.splice(active,1);active=Math.min(active,entries.length-1);updatePeople(entries);syncPeople(true);get('[data-people-status]').textContent='Description removed. You can undo this.';}
  if(button.hasAttribute('data-people-undo')&&undo&&entries.length<MAX_PEOPLE){entries.splice(undo.index,0,undo.text);active=undo.index;undo=undefined;updatePeople(entries);syncPeople(true);get('[data-people-status]').textContent='Description restored.';}
 },options);
 people?.addEventListener('keydown',event=>{const ev=event as KeyboardEvent,button=(ev.target as Element).closest<HTMLButtonElement>('[data-person]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;ev.preventDefault();const count=peopleDescriptions(getDraft()).length;active=ev.key==='Home'?0:ev.key==='End'?count-1:(Number(button.dataset.person)+(ev.key==='ArrowRight'?1:count-1))%count;syncPeople();get<HTMLButtonElement>(`[data-person="${active}"]`).focus();},options);
 people?.querySelector<HTMLTextAreaElement>('[data-people-text]')?.addEventListener('input',event=>{const entries=peopleDescriptions(getDraft());entries[active]=(event.target as HTMLTextAreaElement).value;updatePeople(entries);const button=get<HTMLButtonElement>(`[data-person="${active}"]`);button.setAttribute('aria-label',`Edit description ${active+1}: ${entries[active]!.trim().slice(0,70)||'empty'}`);},options);
 for(const input of root.querySelectorAll<HTMLTextAreaElement>('[data-brand-answer]'))input.addEventListener('input',()=>{const draft=getDraft();draft.answers[input.dataset.brandAnswer as BrandAnswerId]=input.value;draft.promptSet='experience-v3';changed();},options);
 function sync():void{for(const input of root.querySelectorAll<HTMLTextAreaElement>('[data-brand-answer]'))input.value=getDraft().answers[input.dataset.brandAnswer as BrandAnswerId]||'';const earlier=root.querySelector<HTMLElement>('[data-earlier-feeling]');if(earlier){earlier.hidden=!getDraft().answers.feeling;root.querySelector('[data-earlier-feeling-text]')!.textContent=getDraft().answers.feeling||'';}syncPeople();}
 sync();return {sync,destroy(){abort.abort();}};
}
