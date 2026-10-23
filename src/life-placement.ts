import type {PassageBox} from './life-passage.js';
export type LifePlacement={x:number;y:number;size:number;box:PassageBox};
// Fit the complete animated silhouette, not just its centre. This runs only
// when layout changes; it never moves content or follows the scrolling viewport.
export function placeLife(region:PassageBox,desired:{x:number;y:number;size:number},extent:{x:number;y:number},actions:PassageBox[],gap=14):LifePlacement {
 const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
 for(let size=desired.size;size>=24;size*=.94){
  const hx=size*extent.x,hy=size*extent.y;
  const left=region.left+hx,right=region.left+region.width-hx;
  const top=region.top+hy,bottom=region.top+region.height-hy;
  if(left>right||top>bottom)continue;
  const xs=[desired.x,left,right],ys=[desired.y,top,bottom];
  for(const a of actions){xs.push(a.left-gap-hx,a.left+a.width+gap+hx);ys.push(a.top-gap-hy,a.top+a.height+gap+hy);}
  let best:LifePlacement|undefined,cost=Infinity;
  for(const xx of xs)for(const yy of ys){
   const x=clamp(xx,left,right),y=clamp(yy,top,bottom);
   const box={left:x-hx,top:y-hy,width:hx*2,height:hy*2};
   if(actions.some(a=>box.left<a.left+a.width+gap&&box.left+box.width>a.left-gap&&box.top<a.top+a.height+gap&&box.top+box.height>a.top-gap))continue;
   const distance=(x-desired.x)**2+(y-desired.y)**2;
   if(distance<cost){cost=distance;best={x,y,size,box};}
  }
  if(best)return best;
 }
 // A tiny/fully occupied region may have no safe decorative position.
 return {x:desired.x,y:desired.y,size:0,box:{left:desired.x,top:desired.y,width:0,height:0}};
}
