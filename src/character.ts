import {characterQuestions,characterReady,characterRecord,characterText,type CharacterKind,type CharacterMetadata,type CharacterRole} from './character-model.js';
import {CharacterWorkspace,profileLinks,worksheetRole} from './character-workspace.js';
export function defineCharacter():void {
 class AnimaCharacter extends HTMLElement {
  private events?:AbortController;
  private workspace=new CharacterWorkspace();
  private get characterRole():CharacterRole {return worksheetRole(this.workspace.active.kind);}
  private metadata():CharacterMetadata {const d=this.workspace.active;return {id:d.id,kind:d.kind,name:d.name,profileLinks:profileLinks(d.profileInput).links};}
  private objectURL:string|null=null;
  private request=0;
  private get<T extends Element>(selector:string):T {return this.querySelector<T>(selector)!;}
  private focusPart(selector:string):void {cancelAnimationFrame(this.request);this.request=requestAnimationFrame(()=>{const target=this.get<HTMLElement>(selector);const details=target.closest('details');if(details)details.open=true;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});});}
  selectRole(role:CharacterRole):void {this.selectKind(role);}
  selectKind(kind:CharacterKind):void {this.workspace.selectKind(kind);this.render();}
  talentCharacters():{id:string;name:string;description:string}[]{return this.workspace.list('talent').filter(draft=>draft.name.trim()||Object.values(draft.answers).some(answer=>answer.trim())).map((draft,index)=>({id:draft.id,name:draft.name.trim().slice(0,80)||`Talent character ${index+1}`,description:(draft.answers.expression||'').trim().slice(0,400)}));}
  addTalentCharacter(name:string,description:string):string {
   if(!name.trim())throw new Error('Give this character a name.');
   const draft=this.workspace.create('talent');draft.name=name.trim().slice(0,80);
   if(description.trim())draft.answers.expression=description.trim().slice(0,400);
   this.render();return draft.id;
  }
  private announceCharacters():void {this.dispatchEvent(new CustomEvent('anima:talent-characters-change',{bubbles:true}));}
  connectedCallback():void {
   this.events?.abort();this.events=new AbortController();const options={signal:this.events.signal};
   this.get('#character-form').addEventListener('submit',event=>{
    event.preventDefault();if(!this.validateProfiles()){this.focusPart('#character-profiles');return;}const prompt=characterQuestions(this.workspace.active.kind)[this.workspace.active.step];
    if(!prompt)return;
    const answer=this.get<HTMLTextAreaElement>('#character-answer');
    if(!characterReady(prompt,answer.value)){
     const error=this.get<HTMLElement>('#character-error');error.hidden=false;error.textContent='Add a little more detail so the working character has something meaningful to hold onto.';answer.setAttribute('aria-invalid','true');answer.focus();return;
    }
    this.workspace.active.answers[prompt.id]=answer.value;this.workspace.active.step++;this.render();this.focusPart(this.workspace.active.step===characterQuestions(this.workspace.active.kind).length?'#character-result':'#character-question');
   },options);
   this.get('#character-answer').addEventListener('input',()=>{
    const prompt=characterQuestions(this.workspace.active.kind)[this.workspace.active.step];if(!prompt)return;
    this.workspace.active.answers[prompt.id]=this.get<HTMLTextAreaElement>('#character-answer').value;
    this.get<HTMLElement>('#character-error').hidden=true;this.get('#character-answer').removeAttribute('aria-invalid');if(this.workspace.active.kind==='talent')this.announceCharacters();
   },options);
   this.addEventListener('click',event=>{
    if((event.target as Element).closest('#character-conversation'))this.dispatchEvent(new CustomEvent('anima:character-handoff',{bubbles:true,detail:{role:this.characterRole,kind:this.workspace.active.kind,characterId:this.workspace.active.id,text:characterText(this.characterRole,this.workspace.active.answers,this.metadata())}}));
    const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button)return;
    const kind=button.dataset.characterKind||button.dataset.characterRole;
    if(kind==='icp'||kind==='creator'||kind==='talent'){this.selectKind(kind);this.focusPart(this.workspace.active.step>=characterQuestions(kind).length?'#character-result':'#character-question');}
    if(button.hasAttribute('data-character-new')){if(this.workspace.canCreate){this.workspace.create(this.workspace.active.kind);this.render();this.focusPart('#character-name');}}
    if(button.hasAttribute('data-character-back')){this.workspace.active.step=Math.max(0,this.workspace.active.step-1);this.render();this.focusPart('#character-question');}
    if(button.dataset.characterEdit!==undefined){this.workspace.active.step=Number(button.dataset.characterEdit);this.render();this.focusPart('#character-question');}
    if(button.hasAttribute('data-character-discard')){this.dispatchEvent(new CustomEvent('anima:character-discard',{bubbles:true,detail:{role:this.characterRole,kind:this.workspace.active.kind,characterId:this.workspace.active.id}}));this.workspace.discard();this.releaseDownload();this.render();this.focusPart('#character-question');}
    if(button.hasAttribute('data-character-export'))this.download();
    if(button.hasAttribute('data-character-copy'))void this.copy();
   },options);
   this.get('#character-select').addEventListener('change',()=>{this.workspace.select(this.get<HTMLSelectElement>('#character-select').value);this.render();},options);
   this.get('#character-name').addEventListener('input',()=>{this.workspace.active.name=this.get<HTMLInputElement>('#character-name').value;const option=this.get<HTMLSelectElement>('#character-select').selectedOptions[0];if(option)option.textContent=this.workspace.active.name||`Untitled character ${this.get<HTMLSelectElement>('#character-select').selectedIndex+1}`;if(this.workspace.active.kind==='talent')this.announceCharacters();},options);
   this.get('#character-profiles').addEventListener('input',()=>{this.workspace.active.profileInput=this.get<HTMLTextAreaElement>('#character-profiles').value;this.validateProfiles();},options);this.render();
  }
  disconnectedCallback():void {this.events?.abort();cancelAnimationFrame(this.request);this.releaseDownload();}
  private releaseDownload():void {if(this.objectURL)URL.revokeObjectURL(this.objectURL);this.objectURL=null;}
  private validateProfiles():boolean {const result=profileLinks(this.workspace.active.profileInput),error=this.get<HTMLElement>('#character-profile-error');error.textContent=result.error;error.hidden=!result.error;this.get('#character-profiles').setAttribute('aria-invalid',String(!!result.error));return !result.error;}
  private download():void {
   if(!this.validateProfiles())return;
   this.releaseDownload();this.objectURL=URL.createObjectURL(new Blob([JSON.stringify(characterRecord(this.characterRole,this.workspace.active.answers,this.metadata()),null,2)+'\n'],{type:'application/json'}));
   const link=document.createElement('a');link.href=this.objectURL;link.download=`anima-${this.workspace.active.kind}-character-${this.workspace.active.id.slice(0,8)}.json`;link.click();this.get('#character-export-status').textContent='Character download prepared. Nothing has been sent.';
  }
  private async copy():Promise<void> {
   if(!this.validateProfiles())return;
   try{await navigator.clipboard.writeText(characterText(this.characterRole,this.workspace.active.answers,this.metadata()));this.get('#character-export-status').textContent='Character copied. Nothing has been sent.';}
   catch{this.get('#character-export-status').textContent='Copy is unavailable here. Download the character instead.';}
  }
  private render():void {
   const prompts=characterQuestions(this.workspace.active.kind),step=this.workspace.active.step,answers=this.workspace.active.answers,prompt=prompts[step],result=!prompt;
   const kind=this.workspace.active.kind;
   this.get('#character-title').textContent=kind==='talent'?'Define your talent character.':this.characterRole==='icp'?'Build your audience character.':'Build your creative character.';
   this.get<HTMLSelectElement>('#character-select').replaceChildren(...this.workspace.list(kind).map((draft,index)=>{const option=document.createElement('option');option.value=draft.id;option.textContent=draft.name||`Untitled character ${index+1}`;option.selected=draft.id===this.workspace.active.id;return option;}));
   this.get<HTMLInputElement>('#character-name').value=this.workspace.active.name;
   this.get<HTMLInputElement>('#character-name').placeholder=kind==='icp'?'A name for this audience':'A name for this side of you';
   this.get('#character-multiplicity').textContent=kind==='icp'?'A business can hold several audience characters—for different desires, occasions or briefs. These drafts stay in this tab.':'One person can hold several characters. Keep distinct voices, worlds or ways of showing up. These drafts stay in this tab.';
   this.get('#character-profiles-label').textContent=kind==='icp'?'Source profiles for this audience':'Profiles that express this character';
   this.get('#character-profile-help').textContent=kind==='icp'?'One https:// link per line. These are optional reference profiles, not a claim that an audience is one real person. Adding a link does not connect, fetch or publish an account.':'One https:// link per line. A character can span profiles, and the same profile can support more than one character. Adding a link does not connect, fetch or publish an account.';
   this.get<HTMLTextAreaElement>('#character-profiles').value=this.workspace.active.profileInput;
   this.get<HTMLButtonElement>('[data-character-new]').disabled=!this.workspace.canCreate;
   this.validateProfiles();
   this.get('#character-orientation').textContent=kind==='talent'?'Describe one side of your presence, the profiles that express it and what you want to be considered for.':this.characterRole==='icp'?'Begin with desire, tension and the people who make a different life feel possible.':'Begin with your work, your point of view and the boundaries you choose.';
   this.querySelectorAll<HTMLButtonElement>('[data-character-role],[data-character-kind]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.characterKind||button.dataset.characterRole)===kind)));
   this.get<HTMLFormElement>('#character-form').hidden=result;this.get<HTMLElement>('#character-result').hidden=!result;
   this.get<HTMLElement>('#character-error').hidden=true;this.get('#character-answer').removeAttribute('aria-invalid');this.get('#character-export-status').textContent='';
   if(prompt){this.get('#character-progress').textContent=`${step+1} of ${prompts.length} · ${prompt.label}`;this.get('#character-question').textContent=prompt.title;this.get('#character-help').textContent=prompt.help;const answer=this.get<HTMLTextAreaElement>('#character-answer');answer.value=answers[prompt.id]||'';answer.placeholder=prompt.placeholder;answer.required=prompt.id!=='metrics';this.get<HTMLButtonElement>('[data-character-back]').hidden=step===0;this.get('[data-character-next]').firstChild!.textContent=step===prompts.length-1?'Review your character ':'Continue ';}
   const cards=(all:boolean)=>prompts.flatMap((p,index)=>{
    if(!answers[p.id]||(!all&&index>=step))return [];
    const article=document.createElement('article'),label=document.createElement('span'),text=document.createElement('p'),edit=document.createElement('button');
    label.className='character-source';label.textContent=`You said · ${p.label}`;text.textContent=answers[p.id]||'';edit.type='button';edit.className='text-link';edit.dataset.characterEdit=String(index);edit.textContent=`Edit ${p.label.toLowerCase()}`;article.append(label,text,edit);return [article];
   });
   this.get('#character-working').replaceChildren(...cards(false));this.get<HTMLElement>('#character-empty').hidden=step>0;this.get<HTMLElement>('.character-understanding').hidden=result;
   this.get('#character-statements').replaceChildren(...(result?cards(true):[]));
   const conversation=this.get<HTMLAnchorElement>('#character-conversation');conversation.dataset.roleEntry=kind==='talent'?'talent':this.characterRole==='icp'?'client':'creator';
   this.get('#character-next-copy').textContent=kind==='icp'?'An audience character can be reflected alongside creator and talent characters: the desires they make credible, their shared worlds, and the differences that matter.':'A creator or talent character can be reflected alongside business audience characters: where your presence belongs, which desires you can credibly model, and what work fits your boundaries.';
   const flowReturn=this.get<HTMLAnchorElement>('[data-character-flow-return]');flowReturn.hidden=kind==='creator';flowReturn.href=kind==='icp'?'#business-start':'#talent-start';flowReturn.setAttribute('aria-controls',kind==='icp'?'business-start-panel':'talent-start-panel');flowReturn.textContent=kind==='icp'?'Back to your business path':'Back to your talent path';
   conversation.querySelector('.action-label')!.textContent=kind==='talent'?'Continue to roster details':kind==='icp'?'Discuss this audience':'Bring this into a conversation';
   this.dataset.kind=kind;
   this.dataset.role=this.characterRole;this.dataset.step=String(step);this.announceCharacters();
  }
 }
 if(!customElements.get('anima-character'))customElements.define('anima-character',AnimaCharacter);
}
export function connectCharacterHandoff():{destroy():void} {
 const events=new AbortController();
 const clearReceipt=()=>{const receipt=document.querySelector<HTMLElement>('#introduction-receipt')!;receipt.replaceChildren();receipt.hidden=true;};
 document.addEventListener('anima:character-discard',event=>{
  if(!(event instanceof CustomEvent))return;
  const role=event.detail?.role;if(role!=='icp'&&role!=='creator')return;
  const kind=event.detail?.kind;
  const form=document.querySelector<HTMLFormElement>(`[data-intro-form="${kind==='talent'?'talent':role==='icp'?'client':'creator'}"]`)!;
  const existing=form.querySelector<HTMLInputElement>('[name="characterDraft"]');
  if(event.detail?.characterId&&existing?.dataset.characterId&&event.detail.characterId!==existing.dataset.characterId)return;
  existing?.remove();form.querySelector('.character-handoff-summary')?.remove();clearReceipt();
 },{signal:events.signal});
 document.addEventListener('anima:character-handoff',event=>{
  if(!(event instanceof CustomEvent))return;
  const {role,text,kind,characterId}=event.detail||{};
  if((role!=='icp'&&role!=='creator')||typeof text!=='string'||text.length>20000)return;
  const form=document.querySelector<HTMLFormElement>(`[data-intro-form="${kind==='talent'?'talent':role==='icp'?'client':'creator'}"]`)!;
  let input=form.querySelector<HTMLInputElement>('input[name="characterDraft"]');
  if(!input){input=document.createElement('input');input.type='hidden';input.name='characterDraft';form.append(input);}
  input.value=text;if(typeof characterId==='string')input.dataset.characterId=characterId;
  let summary=form.querySelector<HTMLDetailsElement>('.character-handoff-summary');
  if(!summary){summary=document.createElement('details');summary.className='character-handoff-summary';const label=document.createElement('summary'),body=document.createElement('p');label.textContent='Your character is included in this note';summary.append(label,body);form.prepend(summary);}
  summary.querySelector('p')!.textContent=text;
  clearReceipt();
 },{signal:events.signal});
 return {destroy(){events.abort();}};
}
