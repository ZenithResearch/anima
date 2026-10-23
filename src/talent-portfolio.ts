import {MEDIA_FORMATS,PORTFOLIO_SCHEMA,PORTFOLIO_LIMIT,readTalentPortfolio} from '../water/talent-portfolio.mjs';
import {OPPORTUNITY_OPTIONS} from '../water/talent-opportunities.mjs';
type CharacterRef={id:string;name:string;description:string};
type MediaLink={id:string;format:string;title:string;url:string;workTypes:string[];characterIds:string[]};
type CharacterBuilder=HTMLElement&{talentCharacters():CharacterRef[];addTalentCharacter(name:string,description:string):string};
export function defineTalentPortfolio():void {
 class AnimaTalentPortfolio extends HTMLElement {
  private events?:AbortController;
  private entries:MediaLink[]=[];
  private characters:CharacterRef[]=[];
  private rememberedNames=new Map<string,string>();
  private removed:{entry:MediaLink;index:number}|null=null;
  private form!:HTMLFormElement;
  private get<T extends Element>(selector:string):T{return this.querySelector<T>(selector)!;}
  private builder():CharacterBuilder|null{return document.querySelector<CharacterBuilder>('anima-character');}
  private selectedWork():string[]{return OPPORTUNITY_OPTIONS.filter(option=>this.form.querySelector<HTMLInputElement>(`.talent-opportunities input[name="${option.key}"]`)?.checked).map(option=>option.key);}
  private entry():MediaLink{return {id:crypto.randomUUID(),format:'portfolio',title:'',url:'',workTypes:[],characterIds:[]};}
  private notify():void {this.write();this.dispatchEvent(new Event('input',{bubbles:true}));}
  private payload(){
   const ids=new Set(this.entries.flatMap(entry=>entry.characterIds));
   return {schema:PORTFOLIO_SCHEMA,characters:this.characters.filter(character=>ids.has(character.id)),media:this.entries};
  }
  private write():void {
   this.get<HTMLInputElement>('[name="talentPortfolio"]').value=JSON.stringify(this.payload());
   this.get<HTMLInputElement>('[name="portfolio"]').value=this.entries[0]?.url||'';
   this.get<HTMLButtonElement>('[data-media-add]').disabled=this.entries.length>=PORTFOLIO_LIMIT;
   this.get('[data-media-limit]').textContent=`${this.entries.length} of ${PORTFOLIO_LIMIT} links`;
   for(const button of this.querySelectorAll<HTMLButtonElement>('[data-media-remove]'))button.disabled=this.entries.length===1;
   this.get<HTMLElement>('[data-media-undo]').hidden=!this.removed;
   this.get<HTMLButtonElement>('[data-media-restore]').disabled=this.entries.length>=PORTFOLIO_LIMIT;
  }
  private catalog():void {
   this.characters=this.builder()?.talentCharacters()||[];
   for(const character of this.characters)this.rememberedNames.set(character.id,character.name);
   const list=this.get('[data-media-characters]');
   list.replaceChildren(...this.characters.map(character=>{const item=document.createElement('li');const name=document.createElement('strong'),description=document.createElement('span');name.textContent=character.name;description.textContent=character.description;item.append(name,description);return item;}));
   this.get<HTMLElement>('[data-media-no-characters]').hidden=!!this.characters.length;
   this.assignments();this.write();
  }
  private choice(name:string,value:string,label:string,checked:boolean):HTMLLabelElement {
   const wrapper=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');
   wrapper.className='check';input.type='checkbox';input.name=name;input.value=value;input.checked=checked;text.textContent=label;wrapper.append(input,text);return wrapper;
  }
  private assignments():void {
   const selected=this.selectedWork();
   for(const entry of this.entries){
    const card=this.get<HTMLElement>(`[data-media-id="${entry.id}"]`);
    if(!card)continue;
    const work=card.querySelector('[data-media-work]')!,characters=card.querySelector('[data-media-character-links]')!;
    const available=OPPORTUNITY_OPTIONS.filter(option=>selected.includes(option.key)||entry.workTypes.includes(option.key));
    work.replaceChildren(...available.map(option=>this.choice(`media-work-${entry.id}`,option.key,option.label+(selected.includes(option.key)?'':' — not selected above'),entry.workTypes.includes(option.key))));
    if(!available.length){const hint=document.createElement('p');hint.className='form-note';hint.textContent='Choose your work types above, then select which ones this link supports.';work.append(hint);}
    const ids=[...new Set([...this.characters.map(character=>character.id),...entry.characterIds])];
    characters.replaceChildren(...ids.map(id=>this.choice(`media-character-${entry.id}`,id,this.characters.find(character=>character.id===id)?.name||`${this.rememberedNames.get(id)||'Character'} — removed; unlink or choose another`,entry.characterIds.includes(id))));
    if(!ids.length){const hint=document.createElement('p');hint.className='form-note';hint.textContent='Add a character above to connect it here, or keep this as a general work sample.';characters.append(hint);}
   }
  }
  private addCard(entry:MediaLink):void {
   const card=document.createElement('details');card.className='talent-media-card';card.dataset.mediaId=entry.id;card.open=true;
   // Static structure; authored titles, URLs and descriptions use DOM properties.
   card.innerHTML='<summary><span data-media-heading>Portfolio</span></summary><div class="talent-media-fields"><label>Link format<select data-media-format></select></label><label>Title <small>Optional</small><input data-media-title maxlength="80" placeholder="e.g. Commercial voice demo"></label><label>Link URL<input data-media-url type="url" required maxlength="1500" placeholder="https://"></label><fieldset><legend>Relevant work types</legend><div data-media-work></div></fieldset><fieldset><legend>Characters <small>Optional</small></legend><p class="form-note">A sample can support several characters. Leave this empty for a general sample.</p><div data-media-character-links></div></fieldset><button type="button" class="text-link" data-media-remove>Remove link</button></div>';
   const select=card.querySelector<HTMLSelectElement>('[data-media-format]')!;
   for(const format of MEDIA_FORMATS){const option=document.createElement('option');option.value=format.id;option.textContent=format.label;select.append(option);}select.value=entry.format;select.name=`media-format-${entry.id}`;
   const title=card.querySelector<HTMLInputElement>('[data-media-title]')!,url=card.querySelector<HTMLInputElement>('[data-media-url]')!;
   title.name=`media-title-${entry.id}`;title.value=entry.title;url.name=`media-url-${entry.id}`;url.value=entry.url;
   this.get('[data-media-list]').append(card);
  }
  validate():boolean {
   for(const input of this.querySelectorAll<HTMLInputElement>('input'))input.setCustomValidity('');
   const pending=this.get<HTMLInputElement>('[data-character-add-name]'),description=this.get<HTMLTextAreaElement>('[data-character-add-description]');
   if(pending.value.trim()||description.value.trim()){pending.setCustomValidity('Add this character, or clear its name and description before preparing the request.');return false;}
   const result=readTalentPortfolio(this.payload(),this.selectedWork());
   const error=result.errors[0];
   if(error){
    const index=Number(error.path.split('.')[1]||0),card=this.querySelectorAll<HTMLDetailsElement>('[data-media-id]')[index]||this.querySelector<HTMLDetailsElement>('[data-media-id]');
    if(card){
     card.open=true;let target:HTMLInputElement|null=null;
     if(error.path.endsWith('workTypes')){
      const choices=[...card.querySelectorAll<HTMLInputElement>('[data-media-work] input')],selected=this.selectedWork();
      target=choices.find(input=>input.checked&&!selected.includes(input.value))||choices[0]||null;
     }
     if(error.path.endsWith('characterIds')){
      const choices=[...card.querySelectorAll<HTMLInputElement>('[data-media-character-links] input')];
      target=choices.find(input=>input.checked&&!this.characters.some(character=>character.id===input.value))||choices[0]||null;
     }
     (target||card.querySelector<HTMLInputElement>('[data-media-url]'))?.setCustomValidity(error.message);
    }
    return false;
   }
   this.get<HTMLInputElement>('[name="talentPortfolio"]').value=JSON.stringify(result.value);return true;
  }
  connectedCallback():void {
   this.events?.abort();this.events=new AbortController();const options={signal:this.events.signal};
   this.form=this.closest('form')!;
   if(!this.entries.length)this.entries.push(this.entry());
   this.get('[data-media-list]').replaceChildren();for(const entry of this.entries)this.addCard(entry);this.catalog();
   const refresh=()=>{this.catalog();this.notify();};
   document.addEventListener('anima:talent-characters-change',refresh,options);
   this.form.addEventListener('anima:opportunities-change',()=>{this.assignments();this.notify();},options);
   this.addEventListener('invalid',event=>{const details=(event.target as HTMLElement).closest('details');if(details)details.open=true;},{...options,capture:true});
   const edit=(event:Event)=>{
    const target=event.target;if(!(target instanceof HTMLInputElement||target instanceof HTMLSelectElement||target instanceof HTMLTextAreaElement))return;
    target.setCustomValidity('');
    const card=target.closest<HTMLElement>('[data-media-id]'),entry=this.entries.find(item=>item.id===card?.dataset.mediaId);
    if(entry&&card){
     entry.format=card.querySelector<HTMLSelectElement>('[data-media-format]')!.value;entry.title=card.querySelector<HTMLInputElement>('[data-media-title]')!.value;entry.url=card.querySelector<HTMLInputElement>('[data-media-url]')!.value;
     entry.workTypes=[...card.querySelectorAll<HTMLInputElement>('[data-media-work] input:checked')].map(input=>input.value);entry.characterIds=[...card.querySelectorAll<HTMLInputElement>('[data-media-character-links] input:checked')].map(input=>input.value);
     // Clear a stale cross-field message as the associations are corrected.
     for(const input of card.querySelectorAll<HTMLInputElement>('input'))input.setCustomValidity('');
     card.querySelector('[data-media-heading]')!.textContent=entry.title.trim()||MEDIA_FORMATS.find(format=>format.id===entry.format)!.label;
    }else this.get<HTMLInputElement>('[data-character-add-name]').setCustomValidity('');
    this.write();
   };
   this.addEventListener('input',edit,options);this.addEventListener('change',edit,options);
   this.addEventListener('click',event=>{
    const target=(event.target as Element).closest('button');if(!target)return;
    if(target.hasAttribute('data-media-add')&&this.entries.length<PORTFOLIO_LIMIT){for(const card of this.querySelectorAll<HTMLDetailsElement>('[data-media-id]'))card.open=false;const entry=this.entry();this.entries.push(entry);this.addCard(entry);this.assignments();this.notify();this.get<HTMLSelectElement>(`[data-media-id="${entry.id}"] select`).focus();}
    if(target.hasAttribute('data-media-remove')&&this.entries.length>1){const card=target.closest<HTMLElement>('[data-media-id]')!,index=this.entries.findIndex(entry=>entry.id===card.dataset.mediaId);this.removed={entry:this.entries[index]!,index};this.entries.splice(index,1);card.remove();this.notify();this.get<HTMLButtonElement>('[data-media-restore]').focus();}
    if(target.hasAttribute('data-media-restore')&&this.removed&&this.entries.length<PORTFOLIO_LIMIT){const {entry,index}=this.removed;this.removed=null;this.entries.splice(index,0,entry);this.addCard(entry);const list=this.get('[data-media-list]'),card=this.get<HTMLDetailsElement>(`[data-media-id="${entry.id}"]`);list.insertBefore(card,list.children[index]||null);this.assignments();this.notify();card.querySelector<HTMLElement>('summary')!.focus();}
    if(target.hasAttribute('data-character-add')){
     const name=this.get<HTMLInputElement>('[data-character-add-name]'),description=this.get<HTMLTextAreaElement>('[data-character-add-description]'),builder=this.builder();
     if(!name.value.trim()){name.setCustomValidity('Give this character a name.');name.reportValidity();return;}
     try{if(!builder)throw new Error('Character drafts are unavailable.');builder.addTalentCharacter(name.value.trim(),description.value.trim());name.value='';description.value='';name.setCustomValidity('');this.get('[data-character-add-status]').textContent='Character added. Choose it on the links it expresses.';this.catalog();this.notify();}
     catch(error){name.setCustomValidity(error instanceof Error?error.message:'This character could not be added.');name.reportValidity();}
    }
   },options);
   this.form.addEventListener('reset',()=>queueMicrotask(()=>{this.removed=null;this.entries=[this.entry()];this.get('[data-media-list]').replaceChildren();this.addCard(this.entries[0]!);this.catalog();this.notify();}),options);
  }
  disconnectedCallback():void {this.events?.abort();}
 }
 if(!customElements.get('anima-talent-portfolio'))customElements.define('anima-talent-portfolio',AnimaTalentPortfolio);
}
