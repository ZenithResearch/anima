// Distinct readings of one illustrative relationship; no live matching or scores.
type Perspective='business'|'talent';
export function defineReflection():void {
 class AnimaReflection extends HTMLElement {
  private events?:AbortController;
  private view:Perspective='business';
  selectPerspective(view:Perspective):void {
   if(view!=='business'&&view!=='talent')return;
   this.view=view;this.render();
  }
  connectedCallback():void {
   this.events?.abort();this.events=new AbortController();
   this.addEventListener('click',event=>{
    const tab=event.target instanceof Element?event.target.closest<HTMLButtonElement>('[data-reflection-view]'):null;
    const view=tab?.dataset.reflectionView;
    if(view==='business'||view==='talent')this.selectPerspective(view);
   },{signal:this.events.signal});
   this.addEventListener('keydown',event=>{
    if(!(event.target instanceof Element)||!event.target.closest('[data-reflection-view]'))return;
    let next:Perspective;
    if(event.key==='Home')next='business';
    else if(event.key==='End')next='talent';
    else if(event.key==='ArrowLeft'||event.key==='ArrowRight')next=this.view==='business'?'talent':'business';
    else return;
    event.preventDefault();this.selectPerspective(next);
    this.querySelector<HTMLButtonElement>(`[data-reflection-view="${next}"]`)?.focus();
   },{signal:this.events.signal});
   this.render();
  }
  private render():void {
   this.querySelectorAll<HTMLButtonElement>('[data-reflection-view]').forEach(tab=>{
    const active=tab.dataset.reflectionView===this.view;
    tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
   });
   this.querySelectorAll<HTMLElement>('[data-reflection-panel]').forEach(panel=>{
    panel.hidden=panel.dataset.reflectionPanel!==this.view;
   });
  }
  disconnectedCallback():void {this.events?.abort();}
 }
 if(!customElements.get('anima-reflection'))customElements.define('anima-reflection',AnimaReflection);
}
