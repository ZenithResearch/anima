// A shared perspective camera for the shader and pointer -> water intersection.
// Input coordinates are client pixels, so a scrolled canvas keeps its alignment.
export const WATER_LEVEL=1.70;
export const POOL_SCALE=.835/.795;
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function chaliceView(width,height){
 const aspect=width/height,portrait=1-smooth(.6,1.1,aspect),narrow=1-smooth(.36,.5,aspect);
 const position=[.10,3.55,5.2+portrait*.4],target=[0,.97-portrait*.16,0];
 const forward=unit(sub(target,position)),right=unit(cross(forward,[0,1,0])),up=cross(right,forward);
 const focal=(1.65+(1.16-1.65)*portrait)*(1-narrow*.23);
 return {position,target,forward,right,up,focal,aspect};
}
export function screenToWater(x,y,rect){
 const view=chaliceView(rect.width,rect.height);
 const u=((x-rect.left)/rect.width-.5)*view.aspect,v=.5-(y-rect.top)/rect.height;
 const ray=view.forward.map((a,i)=>a*view.focal+view.right[i]*u+view.up[i]*v);
 const t=(WATER_LEVEL-view.position[1])/ray[1];
 if(!Number.isFinite(t)||t<=0)return [2,2];
 return [(view.position[0]+ray[0]*t)*POOL_SCALE,(view.position[2]+ray[2]*t)*POOL_SCALE];
}
export function waterToScreen(q,rect){
 const view=chaliceView(rect.width,rect.height),p=[q[0]/POOL_SCALE,WATER_LEVEL,q[1]/POOL_SCALE];
 const relative=sub(p,view.position),z=dot(relative,view.forward);
 return [rect.left+(.5+dot(relative,view.right)*view.focal/(z*view.aspect))*rect.width,rect.top+(.5-dot(relative,view.up)*view.focal/z)*rect.height];
}
