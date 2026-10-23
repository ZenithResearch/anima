import type {Engine} from './core.js';
import {OPPORTUNITY_OPTIONS,OPPORTUNITY_MASK,OPPORTUNITY_ERROR} from '../water/talent-opportunities.mjs';
export type OpportunitySelection = {live:boolean;digital:boolean;atmosphere:boolean;promotion:boolean;mask:number;valid:boolean;types:string[]};
export function opportunityMask(engine:Engine,live:boolean,digital:boolean,atmosphere:boolean,promotion:boolean,additional=0):number {
 return engine.exports?.opportunity_mask_v3?.(+live,+digital,+atmosphere,+promotion,additional) ?? ((engine.exports?.opportunity_mask_v2?.(+live,+digital,+atmosphere,+promotion) ?? ((engine.exports?.opportunity_mask(+live,+digital,+atmosphere) ?? (+live | (+digital<<1) | (+atmosphere<<2))) | (+promotion<<3))) | (additional & (OPPORTUNITY_MASK & ~15)));
}
export function opportunitiesValid(engine:Engine,mask:number):boolean {
 return engine.exports?.opportunities_valid_v2?!!engine.exports.opportunities_valid_v2(mask):!!(mask & OPPORTUNITY_MASK);
}
export function defineOpportunities(engine:Engine):void {
  class AnimaOpportunities extends HTMLElement {
    private events?: AbortController;
    private input(name: string): HTMLInputElement | null { return this.querySelector<HTMLInputElement>(`input[name="${name}"]`); }
    get selection(): OpportunitySelection {
      const live=!!this.input('live')?.checked, digital=!!this.input('digital')?.checked, atmosphere=!!this.input('atmosphere')?.checked, promotion=!!this.input('promotion')?.checked;
      const selected=OPPORTUNITY_OPTIONS.filter(option=>this.input(option.key)?.checked);
      const additional=selected.reduce((mask,option)=>option.bit>=4?mask|(1<<option.bit):mask,0);
      const mask=opportunityMask(engine,live,digital,atmosphere,promotion,additional);
      return {live,digital,atmosphere,promotion,mask,types:selected.map(option=>option.key),valid:opportunitiesValid(engine,mask)};
    }
    validate(): boolean {
      const selection=this.selection;
      const first=this.querySelector<HTMLInputElement>('input[type=checkbox]');
      if(!selection.valid){const group=first?.closest('details');if(group)group.open=true;}
      first?.setCustomValidity(selection.valid?'':OPPORTUNITY_ERROR);
      return selection.valid;
    }
    connectedCallback(): void {
      this.events?.abort();this.events=new AbortController();this.dataset.engine=engine.mode;
      const sync=()=>{
        for(const group of this.querySelectorAll('details')){
          const count=group.querySelectorAll('input:checked').length;
          const note=group.querySelector('[data-opportunity-count]');
          if(note)note.textContent=count?` · ${count} selected`:'';
        }
        const summary=this.querySelector('[data-opportunity-selection]');
        const selected=OPPORTUNITY_OPTIONS.filter(option=>this.input(option.key)?.checked);
        if(summary)summary.textContent=selected.length?selected.map(option=>option.label).join(' · '):'No work types selected yet.';
      };
      sync();
      this.addEventListener('invalid',event=>{const group=(event.target as HTMLElement).closest('details');if(group)group.open=true;},{capture:true,signal:this.events.signal});
      this.addEventListener('change',()=>{
        this.querySelector<HTMLInputElement>('input[type=checkbox]')?.setCustomValidity('');sync();
        this.dispatchEvent(new CustomEvent<OpportunitySelection>('anima:opportunities-change',{bubbles:true,detail:this.selection}));
      },{signal:this.events.signal});
      this.closest('form')?.addEventListener('reset',()=>queueMicrotask(()=>{this.querySelector<HTMLInputElement>('input[type=checkbox]')?.setCustomValidity('');sync();}),{signal:this.events.signal});
    }
    disconnectedCallback(): void { this.events?.abort(); }
  }
  if(!customElements.get('anima-opportunities'))customElements.define('anima-opportunities',AnimaOpportunities);
}
