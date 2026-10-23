// Colour-only enhancement: native heading text, typography and accessibility stay intact.
export class HeadingWaterResponse{
 constructor(doc){
  this.doc=doc;this.events=new AbortController();this.lastSample=-Infinity;this.pending=0;
  this.canvas=doc.createElement('canvas');this.context=this.canvas.getContext('2d',{alpha:false,willReadFrequently:true});
  this.measure=()=>{
   this.pending=0;const w=doc.defaultView.innerWidth,h=doc.defaultView.innerHeight;
   this.visible=[...doc.querySelectorAll('main h1,main h2,main h3,main h4')].map(node=>({node,rect:node.getBoundingClientRect()})).filter(({rect})=>rect.width&&rect.height&&rect.bottom>0&&rect.top<h);
   for(const {node,rect} of this.visible){
    node.style.backgroundSize=`${w}px ${h}px`;node.style.backgroundPosition=`${-rect.left}px ${-rect.top}px`;
    if(this.ready){node.style.backgroundImage=this.imageURL;node.classList.add('water-responsive-title');node.dataset.waterResponse='8px';}
   }
  };
  const queue=()=>{if(!this.pending)this.pending=requestAnimationFrame(this.measure);};
  doc.defaultView.addEventListener('scroll',queue,{passive:true,signal:this.events.signal});
  doc.defaultView.addEventListener('resize',queue,{passive:true,signal:this.events.signal});
  this.observer=new MutationObserver(queue);
  const content=doc.querySelector('main');
  if(content)this.observer.observe(content,{childList:true,characterData:true,subtree:true});
  doc.fonts.ready.then(queue);queue();
 }
 update(water,now,quiet){
  if(!this.context||(!quiet&&now-this.lastSample<160))return;
  this.lastSample=now;
  const w=Math.max(1,Math.ceil(this.doc.defaultView.innerWidth/8)),h=Math.max(1,Math.ceil(this.doc.defaultView.innerHeight/8));
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  const ctx=this.context;ctx.drawImage(water,0,0,w,h);const image=ctx.getImageData(0,0,w,h);
  // Keep pale, high-contrast ink. Only its tint follows the actual water pixels.
  for(let i=0;i<image.data.length;i+=4){
   const r=image.data[i],g=image.data[i+1],b=image.data[i+2];
   image.data[i]=Math.max(195,Math.min(255,242-g*.25+(r-b)*.55));
   image.data[i+1]=Math.max(215,Math.min(255,238+(g-r)*.65));
   image.data[i+2]=Math.max(225,Math.min(255,244+(b-r)*.55));
  }
  ctx.putImageData(image,0,0);this.imageURL=`url("${this.canvas.toDataURL()}")`;
  this.ready=true;this.measure();
 }
 destroy(){
  this.events.abort();this.observer.disconnect();if(this.pending)cancelAnimationFrame(this.pending);
  for(const node of this.doc.querySelectorAll('.water-responsive-title')){node.classList.remove('water-responsive-title');node.style.removeProperty('background-image');node.style.removeProperty('background-size');node.style.removeProperty('background-position');delete node.dataset.waterResponse;}
 }
}
