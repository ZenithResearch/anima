import {loadCore} from './core.js';
import {defineComponents} from './components.js';
const engine=await loadCore();defineComponents(engine);document.documentElement.dataset.animaEngine=engine.mode;
const form=document.querySelector<HTMLFormElement>('#specimen-form')!;
const field=form.elements.namedItem('email') as HTMLInputElement;
const error=document.querySelector<HTMLElement>('#specimen-error')!,result=document.querySelector<HTMLElement>('#specimen-result')!;
form.addEventListener('submit',event=>{
 event.preventDefault();const valid=field.validity.valid;
 field.setAttribute('aria-invalid',String(!valid));error.hidden=valid;error.textContent=valid?'':'Enter an email address, such as name@example.com.';
 result.textContent=valid?'This local specimen is valid. Nothing was sent or stored.':'Add a valid email to continue this local specimen.';
 if(valid)result.focus();else field.focus();
});
field.addEventListener('input',()=>{error.hidden=true;field.removeAttribute('aria-invalid');result.textContent='Changes are only in this local specimen.';});
const modal=document.querySelector<HTMLElement & {open(opener:HTMLElement):void}>('#modal-component')!,opener=document.querySelector<HTMLElement>('#specimen-open')!;
opener.addEventListener('click',()=>modal.open(opener));

let processUpdates=0;
document.addEventListener('anima:process-change',()=>{document.querySelector('#process-update-count')!.textContent=`Process updates: ${++processUpdates}`;});
document.querySelector('#specimen-reconnect')!.addEventListener('click',()=>{
 for(const element of document.querySelectorAll('anima-process,anima-opportunities,anima-modal,anima-surface,anima-orbs,anima-brand-references')){
  const placeholder=document.createComment('component lifecycle specimen');element.replaceWith(placeholder);placeholder.replaceWith(element);
 }
 document.querySelector('#component-reconnect-status')!.textContent='Components reconnected. Existing selections are retained; each new action should produce one update.';
});

for(const id of ['orb-modal-open','orb-invitation-open']){
 const button=document.getElementById(id)!;button.addEventListener('click',()=>modal.open(button));
}
document.getElementById('orb-controls')!.addEventListener('anima:orb-change',()=>{
 const form=document.querySelector<HTMLFormElement>('#orb-controls')!,data=new FormData(form),value=String(data.get('substance'));
 const descriptions:Record<string,string>={silver:'a physical presence',glass:'light passing through',ink:'a quieter depth'};
 document.getElementById('orb-reading')!.textContent=`${value.charAt(0).toUpperCase()+value.slice(1)} / ${descriptions[value]??''}. Inner light is ${data.has('innerLight')?'awake':'resting'}.`;
});
const thoughtForm=document.querySelector<HTMLFormElement>('#orb-thought')!,thought=thoughtForm.elements.namedItem('thought') as HTMLInputElement;
thought.addEventListener('input',()=>thought.setCustomValidity(''));
thoughtForm.addEventListener('submit',event=>{
 event.preventDefault();const value=thought.value.trim();thought.setCustomValidity(value?'':'Start with a few words.');
 if(!thoughtForm.reportValidity())return;
 document.getElementById('orb-thought-response')!.textContent=`“${value}” — a thought, surfaced. Nothing saved or sent.`;
});
