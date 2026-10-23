import {TRAIL_COLORS,DEFAULT_TRAIL_COLOR,trailColor} from '../water/trail-colors.mjs';
import {RAIN_COLORS,DEFAULT_RAIN_COLOR,rainColor} from '../water/rain-colors.mjs';
import type {WaterBackdrop} from '../water/backdrop.mjs';

// No persistent palette: the water owns the gesture, a native popover the menu.
export function connectTrailPicker(water:WaterBackdrop):{destroy():void} {
 const events=new AbortController(),options={signal:events.signal};
 const menu=document.createElement('div'),status=document.createElement('div');
 menu.className='trail-menu';menu.dataset.waterControls='';menu.setAttribute('popover','auto');
 menu.setAttribute('role','menu');menu.setAttribute('aria-label','Water colors');
 menu.innerHTML=`<div role="group" aria-label="Trail glow"><p class="trail-menu-title" aria-hidden="true">Trail glow</p>${Object.entries(TRAIL_COLORS).map(([id,color])=>`<button type="button" role="menuitemradio" aria-checked="false" tabindex="-1" data-trail-color="${id}" style="--trail-swatch:${color.swatch}"><span class="trail-dot" aria-hidden="true"></span><span>${color.label}</span><span class="trail-mark" aria-hidden="true">✓</span></button>`).join('')}</div><div class="rain-menu-group" role="group" aria-label="Matrix rain"><p class="trail-menu-title" aria-hidden="true">Matrix rain</p>${Object.entries(RAIN_COLORS).map(([id,color])=>`<button type="button" role="menuitemradio" aria-checked="false" tabindex="-1" data-rain-color="${id}" style="--trail-swatch:${color.swatch}"><span class="trail-dot" aria-hidden="true"></span><span>${color.label}</span><span class="trail-mark" aria-hidden="true">✓</span></button>`).join('')}</div>`;
 status.className='trail-feedback';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
 document.body.append(menu,status);
 const nativePopover=typeof menu.showPopover==='function';if(!nativePopover)menu.hidden=true;
 const choices=[...menu.querySelectorAll<HTMLButtonElement>('button')],trailChoices=choices.filter(choice=>choice.hasAttribute('data-trail-color')),rainChoices=choices.filter(choice=>choice.hasAttribute('data-rain-color')),ids=Object.keys(TRAIL_COLORS);
 const motion=document.querySelector<HTMLButtonElement>('#motion');
 let selected=DEFAULT_TRAIL_COLOR,selectedRain=DEFAULT_RAIN_COLOR,open=false,origin:HTMLElement|null=null,timer=0,chosenAt=-Infinity;
 function close(restore=false):void {
  if(!open)return;open=false;
  if(nativePopover){if(menu.matches(':popover-open'))menu.hidePopover();}else menu.hidden=true;
  if(restore&&origin?.isConnected)origin.focus({preventScroll:true});
 }
 function select(id:string,announce=false):void {
  selected=trailColor(id);water.setTrailColor(selected);
  for(const choice of trailChoices){const active=choice.dataset.trailColor===selected;choice.setAttribute('aria-checked',String(active));choice.tabIndex=active?0:-1;}
  if(!announce)return;
  try{localStorage.setItem('anima.water.trail',selected);}catch{/* Visit-local preference still works. */}
  status.textContent=`Trail glow · ${TRAIL_COLORS[selected]!.label}`;
  status.style.setProperty('--trail-swatch',TRAIL_COLORS[selected]!.swatch);
  status.classList.add('is-visible');clearTimeout(timer);
  timer=window.setTimeout(()=>status.classList.remove('is-visible'),1400);
 }
 function selectRain(id:string,announce=false):void {
  selectedRain=rainColor(id);water.setRainColor(selectedRain);
  for(const choice of rainChoices){const active=choice.dataset.rainColor===selectedRain;choice.setAttribute('aria-checked',String(active));choice.tabIndex=active?0:-1;}
  if(!announce)return;
  try{localStorage.setItem('anima.water.rain',selectedRain);}catch{/* Storage is optional. */}
  status.textContent=`Matrix rain · ${RAIN_COLORS[selectedRain]!.label}`;
  status.style.setProperty('--trail-swatch',RAIN_COLORS[selectedRain]!.swatch);
  status.classList.add('is-visible');clearTimeout(timer);
  timer=window.setTimeout(()=>status.classList.remove('is-visible'),1400);
 }
 let savedRain=DEFAULT_RAIN_COLOR;try{savedRain=localStorage.getItem('anima.water.rain')||savedRain;}catch{/* Storage is optional. */}
 selectRain(savedRain);
 let saved=DEFAULT_TRAIL_COLOR;try{saved=localStorage.getItem('anima.water.trail')||saved;}catch{/* Storage is optional. */}
 select(saved);
 function onWater(target:EventTarget|null):boolean {
  if(!(target instanceof Element)||document.querySelector('dialog[open]'))return false;
  // Text selection, links, form controls and native browser menus stay intact.
  return !target.closest('a,button,input,select,textarea,summary,dialog,label,[contenteditable],h1,h2,h3,h4,h5,h6,p,li,dt,dd,legend,figcaption,header,footer,[data-water-controls]');
 }
 function show(x:number,y:number):void {
  if(!water.ready||document.querySelector('dialog[open]'))return;
  if(!open){
   origin=document.activeElement instanceof HTMLElement?document.activeElement:null;
   if(nativePopover)menu.showPopover();else menu.hidden=false;open=true;
  }
  const rect=menu.getBoundingClientRect();
  menu.style.left=`${Math.max(8,Math.min(x,innerWidth-rect.width-8))}px`;
  menu.style.top=`${Math.max(8,Math.min(y,innerHeight-rect.height-8))}px`;
  choices.find(choice=>choice.dataset.trailColor===selected)?.focus({preventScroll:true});
 }
 document.addEventListener('dblclick',event=>{
  if(!water.ready||event.button!==0||performance.now()-chosenAt<400||!onWater(event.target))return;
  event.preventDefault();close();select(ids[(ids.indexOf(selected)+1)%ids.length]!,true);
 },options);
 document.addEventListener('contextmenu',event=>{
  const keyboardTarget=event.target instanceof Node&&motion?.contains(event.target);
  if(!water.ready||(!onWater(event.target)&&!keyboardTarget)||document.querySelector('dialog[open]'))return;
  event.preventDefault();const rect=motion?.getBoundingClientRect();
  show(event.clientX||rect?.left||16,event.clientY||rect?.bottom||16);
 },options);
 const formerDescription=motion?.getAttribute('aria-description'),formerShortcuts=motion?.getAttribute('aria-keyshortcuts'),formerTitle=motion?.getAttribute('title');
 if(water.ready&&motion){
  const hint='Double-click the water to cycle trail colors. Right-click the water, or press Shift+F10 here, to choose trail and Matrix rain colors.';
  motion.setAttribute('aria-description',hint);motion.setAttribute('aria-keyshortcuts','Shift+F10');motion.title=hint;
  motion.addEventListener('keydown',event=>{
   if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){event.preventDefault();const rect=motion.getBoundingClientRect();show(rect.left,rect.bottom);}
  },options);
 }
 for(const choice of choices)choice.addEventListener('click',()=>{chosenAt=performance.now();if(choice.dataset.rainColor)selectRain(choice.dataset.rainColor,true);else select(choice.dataset.trailColor!,true);close(true);},options);
 menu.addEventListener('keydown',event=>{
  const index=choices.indexOf(document.activeElement as HTMLButtonElement);
  let next:number|undefined;
  if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(index+1)%choices.length;
  if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(index-1+choices.length)%choices.length;
  if(event.key==='Home')next=0;if(event.key==='End')next=choices.length-1;
  if(next!==undefined){event.preventDefault();choices[next]!.focus({preventScroll:true});}
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
  if(event.key==='Tab')close(true);
  if(event.key==='PageDown'||event.key==='PageUp')close(true);
 },options);
 menu.addEventListener('toggle',()=>{open=nativePopover?menu.matches(':popover-open'):!menu.hidden;},options);
 document.addEventListener('pointerdown',event=>{if(open&&!menu.contains(event.target as Node))close();},options);
 // Dismiss for user scrolling, not the browser's automatic focus scrolling.
 window.addEventListener('wheel',()=>close(),{...options,passive:true});
 window.addEventListener('touchmove',()=>close(),{...options,passive:true});
 window.addEventListener('resize',()=>close(),options);
 window.addEventListener('pagehide',()=>{close();clearTimeout(timer);status.classList.remove('is-visible');},options);
 return {destroy(){
  close();events.abort();clearTimeout(timer);menu.remove();status.remove();
  if(motion)for(const [key,value] of [['aria-description',formerDescription],['aria-keyshortcuts',formerShortcuts],['title',formerTitle]] as const){if(value==null)motion.removeAttribute(key);else motion.setAttribute(key,value);}
 }};
}
