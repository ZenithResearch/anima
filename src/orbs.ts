export type OrbSelection={name:string;value:string;checked:boolean};
export function defineOrbs():void {
 class AnimaOrbs extends HTMLElement {
  private events?:AbortController;
  connectedCallback():void {
   this.events?.abort();this.events=new AbortController();
   this.addEventListener('change',event=>{
    const input=event.target;if(!(input instanceof HTMLInputElement)||!this.contains(input))return;
    this.dispatchEvent(new CustomEvent<OrbSelection>('anima:orb-change',{bubbles:true,detail:{name:input.name,value:input.value,checked:input.checked}}));
   },{signal:this.events.signal});
  }
  disconnectedCallback():void {this.events?.abort();}
 }
 if(!customElements.get('anima-orbs'))customElements.define('anima-orbs',AnimaOrbs);
}
