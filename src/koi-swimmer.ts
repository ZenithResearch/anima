import type {Engine} from './core.js';
import type {WaterBackdrop} from '../water/backdrop.mjs';
import {KoiSwim} from './koi-model.js';
import {readKoiClearing} from './koi-clearing.js';
export function connectKoiSwimmer(water:WaterBackdrop,engine:Engine):{refresh():void;destroy():void} {
 const marker=document.querySelector<HTMLElement>('[data-water-life="koi"]')||document.querySelector<HTMLElement>('#koi');
 const host=document.querySelector<HTMLElement>('#presence');
 // Older cached cores keep their existing shader path; no mandatory ABI change.
 if(!marker||!host||!water.ready||!engine.exports?.koi_step||typeof water.setKoiDriver!=='function')return {refresh(){},destroy(){}};
 const seed=crypto.getRandomValues(new Uint32Array(1))[0]!;
 const step=engine.exports.koi_step,metricStep=engine.exports.koi_step_v2;
 const swimmer=new KoiSwim((...args)=>metricStep
  ?metricStep(...args,bounds.hx/bounds.hy):step(...args),seed);
 let bounds={x:0,y:0,hx:1,hy:1},alive=true,frame=0;
 const pose=[0,0,1,0],motion=[0,.7,0,1],output={pose,motion};
 function layout():void {
  frame=0;if(!alive||!marker||!host)return;
  const pond=host.getBoundingClientRect(),r=marker.hasAttribute('data-water-life')?readKoiClearing(marker):{...marker.getBoundingClientRect().toJSON(),size:360},unit=8/pond.width;
  const size=Math.min(r.width,r.size);
  const bodyRadius=size*.36,mx=size*.42;
  const controls=marker.parentElement?.querySelector('.about-heading a,.about-heading button');
  const my=controls?bodyRadius:Math.min(r.height*.23,size*.22);
  // With the study controls gone, let the koi use the upper open water too.
  // Its fins may pass behind letters; actions still retain their own clearance.
  const centerY=r.top+Math.max(r.height*.5,my+16);
  const hx=Math.max(16,r.width*.5-mx),hy=Math.max(16,r.height*.5-my);
  bounds={x:((r.left+r.width*.5-pond.left)/pond.width-.5)*8,y:(centerY+scrollY)*unit,hx:hx*unit,hy:hy*unit};
  if(marker.dataset.waterLife==='koi'){
   marker.dataset.lifeSize=(size*.92).toFixed(1);
   marker.dataset.lifeEnvelope=JSON.stringify({left:r.left+r.width*.5-hx-bodyRadius,top:centerY+scrollY-hy-bodyRadius,width:2*(hx+bodyRadius),height:2*(hy+bodyRadius)});
  }
  host.dataset.koiPassage=[r.top+scrollY,r.top+r.height+scrollY].map(n=>n.toFixed(1)).join(',');
  water.request();
 }
 const request=()=>{if(alive&&!frame)frame=requestAnimationFrame(layout);};
 const observer=new ResizeObserver(request);observer.observe(marker);observer.observe(document.querySelector('main')!);
 document.fonts.ready.then(request);layout();
 host.dataset.koiEngine='wasm';
 water.setKoiDriver((delta,contact,pressure)=>{
  swimmer.advance(delta,(contact[0]!-bounds.x)/bounds.hx,(contact[1]!-bounds.y)/bounds.hy,pressure);
  const [x,y,vx,vy]=swimmer.state,dx=vx*bounds.hx,dy=vy*bounds.hy,length=Math.hypot(dx,dy);
  pose[0]=bounds.x+x*bounds.hx;pose[1]=bounds.y+y*bounds.hy;
  if(length>.001){pose[2]=dx/length;pose[3]=dy/length;}
  motion[0]=swimmer.phase;motion[1]=swimmer.amplitude;motion[2]=swimmer.turn;
  return output;
 });
 return {refresh:request,destroy(){alive=false;observer.disconnect();cancelAnimationFrame(frame);water.setKoiDriver(null);delete host.dataset.koiEngine;delete host.dataset.koiPassage;}};
}
