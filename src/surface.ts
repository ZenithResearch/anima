// Pointer effects only. Native children own navigation, focus and submission.
export function defineSurface():void {
 class AnimaSurface extends HTMLElement {
  private events?:AbortController;
  private frame=0;
  private position:[number,number]=[.55,.20];
  private media?:MediaQueryList;
  connectedCallback():void {
   this.events?.abort();this.events=new AbortController();this.media=matchMedia('(prefers-reduced-motion: reduce)');
   this.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||this.media?.matches)return;
    const control=this.querySelector<HTMLElement>('a,button');if(!control||control.matches(':disabled,[aria-disabled="true"]'))return;
    const rect=control.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
    this.position=[Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))];
    if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.paint();});
   },{signal:this.events.signal});
   this.addEventListener('pointerleave',()=>this.reset(),{signal:this.events.signal});
   this.media.addEventListener('change',()=>this.reset(),{signal:this.events.signal});
  }
  private paint():void {
   this.style.setProperty('--glint-x',`${(25+this.position[0]*50).toFixed(2)}%`);
   this.style.setProperty('--glint-y',`${(10+this.position[1]*35).toFixed(2)}%`);
  }
  private reset():void {cancelAnimationFrame(this.frame);this.frame=0;this.position=[.55,.2];this.paint();}
  disconnectedCallback():void {this.events?.abort();this.reset();}
 }
 if(!customElements.get('anima-surface'))customElements.define('anima-surface',AnimaSurface);
}
