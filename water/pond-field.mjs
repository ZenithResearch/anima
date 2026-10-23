// One water plane in document coordinates; scrolling reveals another part of it.
export const POND_WIDTH=8;
let projectionCore=null;
export function configurePondCore(core){
 if(typeof core?.x!=='function'||typeof core?.y!=='function')throw new TypeError('Expected water projection functions.');
 projectionCore=core;
}
export function pondExtent(width,height){return [POND_WIDTH,height/width*POND_WIDTH];}
export function screenToPond(x,y,rect,scrollY=0){
 if(projectionCore)return [projectionCore.x(x,rect.left,rect.width),projectionCore.y(y,rect.top,scrollY,rect.width)];
 return [((x-rect.left)/rect.width-.5)*POND_WIDTH,(y-rect.top+scrollY)/rect.width*POND_WIDTH];
}
export function pondGrid(extent){
 const width=128,height=Math.min(2048,Math.max(128,Math.ceil(width*extent[1]/extent[0])));
 return [width,height];
}
