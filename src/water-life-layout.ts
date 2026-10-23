import type {WaterBackdrop} from '../water/backdrop.mjs';
import {STUDY_LIFE_SPECIES} from '../water/submerged-life.mjs';
import {readLifePassage} from './life-passage.js';
import {readKoiClearing} from './koi-clearing.js';
import {placeLife} from './life-placement.js';
import type {PassageBox} from './life-passage.js';
// Read document geometry only on layout changes; the water clock owns motion.
export function connectWaterLife(water:WaterBackdrop):{refresh():void;destroy():void} {
 // Keep the responsive hero last; shader identity is keyed by species, not slot.
 const clearings=[...document.querySelectorAll<HTMLElement>('[data-water-life]')].sort((a,b)=>Number(a.hasAttribute('data-water-life-hero'))-Number(b.hasAttribute('data-water-life-hero')));
 const host=document.querySelector<HTMLElement>('#presence')!;
 let frame=0,alive=true;
 function layout():void {
  frame=0;if(!alive)return;
  const pond=host.getBoundingClientRect();
  const tokens=getComputedStyle(document.documentElement);
  const focalX=Number(tokens.getPropertyValue('--anima-semantic-layout-focal-third'))||2/3;
  const focalY=Number(tokens.getPropertyValue('--anima-semantic-layout-minor'))||.381966;
  water.setLifeAnchors(clearings.filter(clearing=>{const r=clearing.getBoundingClientRect();return r.width>0&&r.height>0;}).map(clearing=>{
   const r=clearing.getBoundingClientRect();
   const section=clearing.parentElement!;
   const actions=[...section.querySelectorAll<HTMLElement>('a,button,summary,[role="tab"]')].filter(e=>e.getClientRects().length>0).map(e=>e.getBoundingClientRect());
   function anchor(x:number,y:number,size:number,species:number):number[]{
    const depth=clearing.dataset.lifeDepth===undefined?-1:Number(clearing.dataset.lifeDepth);
    const light=clearing.dataset.lifeLight===undefined?1:Number(clearing.dataset.lifeLight);
    return [((x-pond.left)/pond.width-.5)*8,(y+scrollY)/pond.width*8,size/pond.width*8,species,depth,light];
   }
   function fit(x:number,y:number,size:number,ex:number,ey:number,region:PassageBox=r){
    const placed=placeLife(region,{x,y,size},{x:ex,y:ey},actions);
    clearing.dataset.lifeEnvelope=JSON.stringify({...placed.box,top:placed.box.top+scrollY});
    clearing.dataset.lifeSize=placed.size.toFixed(1);
    return placed;
   }
   if(clearing.hasAttribute('data-water-life-hero')){
    const composition=getComputedStyle(clearing);
    const heroX=Number(composition.getPropertyValue('--anima-component-hero-life-x'))||focalX;
    const heroY=Number(composition.getPropertyValue('--anima-component-hero-life-y'))||.5;
    const intendedSize=Number(composition.getPropertyValue('--anima-component-hero-life-size'))||480;
    // Art direction follows each CSS layout; overlap stays beneath the content.
    const placed=fit(r.left+r.width*heroX,r.top+r.height*heroY,Math.min(intendedSize,r.width*.92,r.height*.88)*.92,.58,.58);
    return anchor(placed.x,placed.y,placed.size,0);
   }
   if(clearing.hasAttribute('data-water-life-distant')){
    const compact=pond.width<=750;
    const desiredX=Number(clearing.dataset.lifeX)||focalX,desiredY=Number(clearing.dataset.lifeY)||.5;
    const weed=clearing.dataset.waterLife==='seaweed',anemone=clearing.dataset.waterLife==='anemone';
    const x=compact?(anemone?.76:weed?.05:desiredX>.5?.74:.24):desiredX;
    const y=compact?(anemone?.26:weed?.56:desiredY):desiredY;
    const size=Math.min(Number(clearing.dataset.lifeIntendedSize)||220,r.width*(compact?.50:.28));
    // Rooted plants do not orbit: use their actual sway/crown bounds so they
    // can sit in narrow open water rather than being pushed beneath paragraphs.
    const placed=fit(r.left+r.width*x,r.top+r.height*y,size,weed?(compact?.17:.28):anemone?.44:.72,weed?.58:anemone?.30:.72);
    return anchor(placed.x,placed.y,placed.size,Math.max(0,STUDY_LIFE_SPECIES.indexOf(clearing.dataset.waterLife||'')));
   }
   if(clearing.dataset.waterLife==='koi'){
    const open=readKoiClearing(clearing);
    return anchor(open.left+open.width*.5,open.top+open.height*.5,open.size*.92,3);
   }
   const jelly=clearing.dataset.waterLife==='jellyfish';
   const size=Math.min(r.width,jelly?420:360);
   // Composition follows the section, independently of the chosen animal.
   const left=clearing.dataset.waterLifeSide?clearing.dataset.waterLifeSide==='left':jelly;
   const passage=readLifePassage(clearing);
   // Lift the jelly into the upper open water beside the heading and copy,
   // with room below its bell for the existing tentacle drift.
   const x=jelly?Math.min(1-focalY*.5,1-size*.48/r.width):(left?1-focalX:focalX);
   const y=jelly?r.top+r.height*focalY+size*.16:passage.top+passage.height*(left?1-focalY:focalY);
   const placed=fit(r.left+r.width*x,y,size*.92,jelly?.55:.72,jelly?.90:.72);
   return anchor(placed.x,placed.y,placed.size,Math.max(0,STUDY_LIFE_SPECIES.indexOf(clearing.dataset.waterLife||'')));
  }).filter(anchor=>(anchor[2]??0)>0));
 }
 function request():void {if(alive&&!frame)frame=requestAnimationFrame(layout);}
 const observer=new ResizeObserver(request);
 for(const clearing of clearings)observer.observe(clearing);
 observer.observe(document.querySelector('main')!);
 document.fonts.ready.then(request);request();
 return {refresh:request,destroy(){alive=false;observer.disconnect();cancelAnimationFrame(frame);}};
}
