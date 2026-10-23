import {loadCore,keyCode} from './core.js';
import {defineComponents} from './components.js';
import {configureInteractionCore} from '../water/landing-model.mjs';
import {configurePondCore} from '../water/pond-field.mjs';
import {connectIntakePanels} from './intake-panels.js';
import {connectWaterLife} from './water-life-layout.js';
import {connectCharacterHandoff} from './character.js';
import {connectTrailPicker} from './trail-picker.js';
import {connectKoiSwimmer} from './koi-swimmer.js';
import {connectBusinessOnboarding} from './business-onboarding.js';
const engine=await loadCore();
defineComponents(engine);
if(engine.exports){
  const core=engine.exports;
  configureInteractionCore((key:string,index:number,count:number)=>{const next=core.next_tab(keyCode(key),index,count);return next<0?null:next;});
  configurePondCore({x:core.pond_x,y:core.pond_y});
}
document.documentElement.dataset.animaEngine=engine.mode;
const panels=connectIntakePanels();
const characterHandoff=connectCharacterHandoff();
const business=connectBusinessOnboarding();
const {water}=await import('../water/landing.mjs');
const life=connectWaterLife(water);
const koi=connectKoiSwimmer(water,engine);
const trail=connectTrailPicker(water);
window.addEventListener('pagehide',event=>{if(!event.persisted){panels.destroy();life.destroy();koi.destroy();trail.destroy();characterHandoff.destroy();business.destroy();}});
