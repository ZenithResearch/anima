// Lifecycle extracted from Juiced's glyph renderer. No j mesh or glyph data is loaded.
export class MirrorBase{
 constructor(host,{onFailure=()=>{}}={}){
  Object.assign(this,{host,canvas:host.querySelector('canvas'),onFailure,reveal:0,target:0,tilt:[0,0],pointer:[0,0],quiet:false,forcedFallback:false,visible:false,frame:0,last:0,resources:[]});
  this.onLost=e=>{e.preventDefault();this.cancel();host.dataset.renderer='fallback';this.lost=true;onFailure();};
  this.onRestored=()=>{this.lost=false;try{this.init();this.request();}catch{this.fail();}};
  this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
  try{this.init();}catch(error){this.fail();console.warn('Mirror uses the complete SVG still:',error.message);}
  this.resizeObserver=new ResizeObserver(()=>this.request());this.resizeObserver.observe(host);
  this.intersectionObserver=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.request();else this.cancel();},{threshold:0});this.intersectionObserver.observe(host);
  this.onVisibility=()=>{if(document.hidden)this.cancel();else this.request();};document.addEventListener('visibilitychange',this.onVisibility);
  this.onPointer=e=>{if(e.pointerType!=='mouse'||this.quiet)return;const r=host.getBoundingClientRect();this.pointer=[((e.clientX-r.left)/r.width-.5)*.30,((e.clientY-r.top)/r.height-.5)*.20];this.request();};
  this.onLeave=()=>{this.pointer=[0,0];this.request();};host.addEventListener('pointermove',this.onPointer);host.addEventListener('pointerleave',this.onLeave);
 }
 fail(){this.ready=false;this.cancel();this.host.dataset.renderer='fallback';this.onFailure();}
 release(){if(!this.gl)return;for(const b of this.resources)this.gl.deleteBuffer(b);this.resources=[];if(this.program)this.gl.deleteProgram(this.program);this.program=null;}
 cancel(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.last=0;this.host.dataset.animating='false';}
 request(){if(this.frame||!this.ready||this.lost||this.forcedFallback||!this.visible||document.hidden)return;this.host.dataset.animating='true';this.frame=requestAnimationFrame(t=>this.draw(t));}
 setReveal(value){this.target=value;this.host.dataset.revealed=String(value>.5);if(this.quiet)this.reveal=value;this.request();}
 setQuiet(value){this.quiet=value;this.host.dataset.quiet=String(value);if(value){this.reveal=this.target;this.tilt=[0,0];this.pointer=[0,0];}this.request();}
 setFallback(value){this.forcedFallback=value;this.host.dataset.renderer=value||!this.ready||this.lost?'fallback':'webgl';if(value)this.cancel();else this.request();}
 destroy(){this.cancel();this.resizeObserver.disconnect();this.intersectionObserver.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);this.host.removeEventListener('pointermove',this.onPointer);this.host.removeEventListener('pointerleave',this.onLeave);this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);this.release();}
}
