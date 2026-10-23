import {MAX_BRAND_REFERENCES,fileReference,linkReference,type BrandReference} from './brand-references-model.js';
import type {ReferenceFiles} from './brand-preview-storage.js';
export interface BrandReferencesElement extends HTMLElement {
 setDraft(references:BrandReference[],files:ReferenceFiles,legacyNotes?:string):void;
 getFiles():ReferenceFiles;
}
export const BrandReferencesMarkup=()=>`<anima-brand-references>
 <div class="reference-imports"><label class="reference-drop"><input type="file" multiple aria-label="Upload reference files"><span>Upload files <span aria-hidden="true">＋</span></span><small>or drop them here · 25 MB each</small></label>
 <form class="intro-form reference-link-form" data-density="compact" novalidate><label for="brand-reference-url" class="sr-only">Website or Pinterest board link</label><input id="brand-reference-url" class="reference-url" type="url" placeholder="Paste a link" maxlength="2000" autocomplete="off"><button type="submit" class="reference-add" aria-label="Add reference link">Add <span aria-hidden="true">＋</span></button></form></div>
 <div class="reference-library" aria-label="Imported references"><div class="reference-items"></div><div class="reference-pager"><span data-reference-count>0 of 12 references</span><div><button type="button" data-reference-undo hidden>Undo remove</button><button type="button" data-reference-previous aria-label="Previous references" disabled>←</button><span data-reference-page></span><button type="button" data-reference-next aria-label="Next references" disabled>→</button></div></div></div>
 <p class="reference-feedback" data-reference-feedback role="status">Files and links stay here. Save in your workspace to keep them on this browser.</p>
 <details class="reference-connections"><summary>Pinterest &amp; connected accounts</summary><p>Account imports are planned. Use board links or files for now.</p></details>
 <details data-reference-legacy hidden><summary>Earlier reference notes</summary><p></p></details>
 </anima-brand-references>`;
export function defineBrandReferences():void {
 class AnimaBrandReferences extends HTMLElement implements BrandReferencesElement {
  private references:BrandReference[]=[];private files:ReferenceFiles=new Map();private urls=new Map<string,string>();private page=0;private events?:AbortController;
  private removed?:{reference:BrandReference;file?:File;index:number};
  private get pageSize():number{return matchMedia('(min-width:700px) and (min-height:650px)').matches?2:1;}
  setDraft(references:BrandReference[],files:ReferenceFiles,legacyNotes=''):void {
   this.revoke();this.references=references.map(r=>({...r}));this.files=new Map(files);this.removed=undefined;this.page=0;
   const legacy=this.querySelector<HTMLDetailsElement>('[data-reference-legacy]')!;legacy.hidden=!legacyNotes;legacy.querySelector('p')!.textContent=legacyNotes;this.render();
  }
  getFiles():ReferenceFiles{return new Map(this.files);}
  connectedCallback():void {
   this.events?.abort();this.events=new AbortController();const options={signal:this.events.signal};
   this.querySelector<HTMLInputElement>('input[type=file]')!.addEventListener('change',event=>{const input=event.target as HTMLInputElement;this.acceptFiles(Array.from(input.files||[]));input.value='';},options);
   const drop=this.querySelector<HTMLElement>('.reference-drop')!;
   drop.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('Files')){event.preventDefault();drop.dataset.drag='true';}},options);
   drop.addEventListener('dragleave',()=>{delete drop.dataset.drag;},options);
   drop.addEventListener('drop',event=>{event.preventDefault();delete drop.dataset.drag;this.acceptFiles(Array.from(event.dataTransfer?.files||[]));},options);
   this.querySelector('form')!.addEventListener('submit',event=>{event.preventDefault();const input=this.querySelector<HTMLInputElement>('.reference-url')!;
    try{const next=linkReference(input.value,crypto.randomUUID());if(next.kind==='file')return;
     if(this.references.some(r=>r.kind!=='file'&&r.url===next.url))throw Error('That link is already in your references.');
     if(this.references.length>=MAX_BRAND_REFERENCES)throw Error('Keep up to 12 references. Remove one to add another.');
     this.references.push(next);this.page=Math.floor((this.references.length-1)/this.pageSize);input.value='';input.removeAttribute('aria-invalid');this.changed('Reference link added.');
    }catch(error){input.setAttribute('aria-invalid','true');this.feedback(error instanceof Error?error.message:'Check that reference link.');input.focus();}
   },options);
   this.querySelector<HTMLInputElement>('.reference-url')!.addEventListener('input',event=>(event.target as HTMLInputElement).removeAttribute('aria-invalid'),options);
   this.addEventListener('click',event=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button)return;
    const id=button.dataset.referenceRemove;
    if(id){const index=this.references.findIndex(r=>r.id===id);if(index<0)return;const reference=this.references[index]!;this.removed={reference,file:this.files.get(id),index};this.references.splice(index,1);this.files.delete(id);this.revoke(id);this.changed(`${reference.name} removed. You can undo.`);this.querySelector<HTMLButtonElement>('[data-reference-undo]')!.focus();}
    else if(button.hasAttribute('data-reference-undo')){if(!this.removed)return;if(this.references.length>=MAX_BRAND_REFERENCES){this.feedback('Remove another reference before restoring this one.');return;}const {reference,file,index}=this.removed;this.references.splice(index,0,reference);if(file)this.files.set(reference.id,file);this.removed=undefined;this.page=Math.floor(index/this.pageSize);this.changed('Reference restored.');this.querySelector<HTMLInputElement>('.reference-url')!.focus();}
    else if(button.hasAttribute('data-reference-previous')){this.page--;this.render();}
    else if(button.hasAttribute('data-reference-next')){this.page++;this.render();}
   },options);
   window.addEventListener('resize',()=>this.render(),options);this.render();
  }
  private feedback(message:string):void{this.querySelector<HTMLDetailsElement>('.reference-connections')!.open=false;this.querySelector('[data-reference-feedback]')!.textContent=message;}
  private changed(message:string):void {
   this.render();this.feedback(message);this.dispatchEvent(new CustomEvent('anima:brand-references-change',{bubbles:true,detail:{references:this.references.map(r=>({...r}))}}));
  }
  private acceptFiles(incoming:File[]):void {
   if(!incoming.length)return;
   try{
    const restored:Array<{id:string;file:File}>=[],additions:File[]=[];
    const batch=new Set<string>();
    for(const file of incoming){
     fileReference(file,'validation');
     const fingerprint=`${file.name}/${file.size}/${file.type}/${file.lastModified}`;
     if(batch.has(fingerprint))continue;batch.add(fingerprint);
     const missing=this.references.find(ref=>ref.kind==='file'&&!this.files.has(ref.id)&&ref.name===file.name&&ref.size===file.size&&ref.type===file.type);
     if(missing){restored.push({id:missing.id,file});continue;}
     if(this.references.some(ref=>{const old=this.files.get(ref.id);return old&&old.name===file.name&&old.size===file.size&&old.lastModified===file.lastModified;}))continue;
     additions.push(file);
    }
    if(this.references.length+additions.length>MAX_BRAND_REFERENCES)throw Error('Keep up to 12 references. Remove one to add another.');
    const validated=additions.map(file=>({reference:fileReference(file,crypto.randomUUID()),file}));
    if(!validated.length&&!restored.length){this.feedback('Those files are already in your references.');return;}
    for(const {reference,file} of validated){this.references.push(reference);this.files.set(reference.id,file);}
    for(const {id,file} of restored)this.files.set(id,file);
    this.page=Math.floor((this.references.length-1)/this.pageSize);this.changed(`${validated.length+restored.length} file${validated.length+restored.length===1?'':'s'} added. Save in your workspace to keep the originals on this browser.`);
   }catch(error){this.feedback(error instanceof Error?error.message:'The files could not be added. Existing references are unchanged.');}
  }
  private objectURL(id:string,file:File,preview=false):string {const key=preview?id+':preview':id;let url=this.urls.get(key);if(!url){url=URL.createObjectURL(preview?file:new Blob([file],{type:'application/octet-stream'}));this.urls.set(key,url);}return url;}
  private revoke(id?:string):void {if(id){for(const key of [id,id+':preview']){const url=this.urls.get(key);if(url)URL.revokeObjectURL(url);this.urls.delete(key);}}else {for(const url of this.urls.values())URL.revokeObjectURL(url);this.urls.clear();}}
  private render():void {
   const list=this.querySelector<HTMLElement>('.reference-items');if(!list)return;
   const pages=Math.max(1,Math.ceil(this.references.length/this.pageSize));this.page=Math.max(0,Math.min(pages-1,this.page));list.replaceChildren();
   if(!this.references.length){const empty=document.createElement('p');empty.className='reference-empty';empty.textContent='Your reference library starts here.';list.append(empty);}
   for(const reference of this.references.slice(this.page*this.pageSize,(this.page+1)*this.pageSize)){
    const item=document.createElement('div');item.className='reference-item';const text=document.createElement('div');
    if(reference.kind==='file'){
     const file=this.files.get(reference.id);
     if(file&&/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type)){const image=document.createElement('img');image.src=this.objectURL(reference.id,file,true);image.alt='';item.append(image);}
     const name=document.createElement(file?'a':'span');name.textContent=reference.name;name.className='reference-name';name.title=reference.name;
     if(file&&name instanceof HTMLAnchorElement){name.href=this.objectURL(reference.id,file);name.download=reference.name;name.setAttribute('aria-label',`Download original ${reference.name}`);}
     const detail=document.createElement('small');detail.textContent=file?`${Math.max(1,Math.round(reference.size/1024))} KB · original file`:'Original unavailable · reselect file';text.append(name,detail);
    }else{
     const link=document.createElement('a');link.href=reference.url;link.target='_blank';link.rel='noopener noreferrer';link.className='reference-name';link.textContent=reference.name;link.title=reference.url;
     const detail=document.createElement('small');detail.textContent=reference.url.replace(/^https?:\/\//,'');detail.title=reference.url;text.append(link,detail);
    }
    const remove=document.createElement('button');remove.type='button';remove.dataset.referenceRemove=reference.id;remove.setAttribute('aria-label',`Remove ${reference.name}`);remove.textContent='×';item.append(text,remove);list.append(item);
   }
   this.querySelector('[data-reference-count]')!.textContent=`${this.references.length} of 12 references`;
   this.querySelector('[data-reference-page]')!.textContent=this.references.length?`${this.page+1} / ${pages}`:'';
   this.querySelector<HTMLButtonElement>('[data-reference-previous]')!.disabled=this.page===0;
   this.querySelector<HTMLButtonElement>('[data-reference-next]')!.disabled=this.page===pages-1;
   this.querySelector<HTMLButtonElement>('[data-reference-undo]')!.hidden=!this.removed;
  }
  disconnectedCallback():void{this.events?.abort();this.revoke();}
 }
 if(!customElements.get('anima-brand-references'))customElements.define('anima-brand-references',AnimaBrandReferences);
}
