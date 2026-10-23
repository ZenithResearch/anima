import {keyCode,type Engine} from './core.js';
import {roles,type ProcessRole} from './process-copy.js';
import {ProcessEvent,decodeProcess,reduceProcess,type ProcessState} from './process-model.js';
export function defineProcess(engine:Engine):void {
 class AnimaProcess extends HTMLElement {
  private events?:AbortController;
  private packed=0;
  private renderedRole:ProcessRole|null=null;
  get state():ProcessState{return decodeProcess(this.packed);}
  private get<T extends Element>(selector:string):T {const node=this.querySelector<T>(selector);if(!node)throw new Error(`Process component missing ${selector}`);return node;}
  private transition(event:number,value=0):void {this.packed=reduceProcess(engine,this.packed,event,value);this.render();}
  selectRole(role:ProcessRole):void {if(role==='client'||role==='creator')this.transition(ProcessEvent.Role,role==='client'?0:1);}
  selectStep(step:number):void {if(Number.isInteger(step)&&step>=0&&step<this.state.count)this.transition(ProcessEvent.Select,step);}
  private chooseRole(role:ProcessRole):void {
   this.selectRole(role);
   this.dispatchEvent(new CustomEvent('anima:process-role-change',{bubbles:true,detail:{role}}));
  }
  connectedCallback():void {
   this.events?.abort();this.events=new AbortController();this.dataset.engine=engine.mode;
   for(const [key,value] of Object.entries(roles)){
    const count=engine.exports?.process_count(key==='client'?0:1)??(key==='client'?6:5);
    if(value.steps.length!==count)throw new Error(`Process copy/state count mismatch: ${key}`);
   }
   this.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;
    const role=target?.closest<HTMLButtonElement>('button[data-role]')?.dataset.role;
    if(role==='client'||role==='creator'){this.chooseRole(role);return;}
    const tab=target?.closest<HTMLButtonElement>('.step-tabs button');
    if(tab)this.selectStep(Number(tab.dataset.step));
   },{signal:this.events.signal});
   this.addEventListener('keydown',event=>{
    const target=event.target instanceof Element?event.target:null,key=keyCode(event.key);if(!key)return;
    const roleButton=target?.closest<HTMLButtonElement>('button[data-role]');
    if(roleButton){
     event.preventDefault();const index=roleButton.dataset.role==='client'?0:1;
     const next=engine.exports?.next_tab(key,index,2)??(key===1||key===2?1-index:key===3?0:1);
     const role=next===0?'client':'creator';this.chooseRole(role);this.get<HTMLElement>(`button[data-role="${role}"]`).focus();return;
    }
    if(target?.closest('.step-tabs button')){
     event.preventDefault();this.transition(key===1?ProcessEvent.Next:key===2?ProcessEvent.Previous:key===3?ProcessEvent.First:ProcessEvent.Last);
     this.get<HTMLElement>(`.step-tabs [data-step="${this.state.step}"]`).focus();
    }
   },{signal:this.events.signal});
   this.render();
  }
  disconnectedCallback():void {this.events?.abort();}
  private render():void {
   const state=this.state,data=roles[state.role],step=data.steps[state.step];if(!step)return;
   for(const button of this.querySelectorAll<HTMLButtonElement>('button[data-role]')){
    const active=button.dataset.role===state.role;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
   }
   this.get('#role-panel').setAttribute('aria-labelledby',`role-${state.role}`);
   this.get('#role-title').textContent=data.title;this.get('#role-intro').textContent=data.intro;
   const tabs=this.get<HTMLElement>('.step-tabs');
   if(this.renderedRole!==state.role||tabs.children.length!==state.count){
    tabs.replaceChildren(...data.steps.map((item,index)=>{
     const button=document.createElement('button');button.type='button';button.id=`step-${index}`;button.dataset.step=String(index);
     button.setAttribute('role','tab');button.setAttribute('aria-controls','step-panel');button.textContent=`${index+1}. ${item.verb}`;return button;
    }));this.renderedRole=state.role;
   }
   for(const button of tabs.querySelectorAll<HTMLButtonElement>('button')){
    const active=Number(button.dataset.step)===state.step;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
   }
   this.get('#step-panel').setAttribute('aria-labelledby',`step-${state.step}`);
   this.get('#step-count').textContent=`${String(state.step+1).padStart(2,'0')} / ${String(state.count).padStart(2,'0')}`;
   this.get('#step-title').textContent=step.title;this.get('#step-copy').textContent=step.copy;this.get('#step-outcome').textContent=step.outcome;
   this.get('#step-prompts').replaceChildren(...step.prompts.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
   this.dataset.role=state.role;this.dataset.step=String(state.step);
   this.dispatchEvent(new CustomEvent('anima:process-change',{bubbles:true,detail:state}));
  }
 }
 if(!customElements.get('anima-process'))customElements.define('anima-process',AnimaProcess);
}
