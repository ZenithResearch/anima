// One motion preference for the water and every wave on the consuming page.
export function connectMotion(button,{renderer=null,page=document}={}){
 const media=matchMedia('(prefers-reduced-motion: reduce)'),events=new AbortController();let moving=!media.matches;
 function sync(){const active=moving&&!media.matches;renderer?.setQuiet(!active);for(const wave of page.querySelectorAll('anima-wave'))wave.toggleAttribute('flow',active);if(button){button.setAttribute('aria-pressed',String(active));button.firstChild.textContent=media.matches?'Still water ':active?'Still water ':'Let it move ';button.disabled=media.matches;}}
 button?.addEventListener('click',()=>{moving=!moving;sync();},{signal:events.signal});media.addEventListener('change',sync,{signal:events.signal});sync();
 return {sync,destroy(){events.abort();}};
}
