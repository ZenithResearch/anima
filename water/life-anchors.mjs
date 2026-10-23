export const MAX_LIFE_ANCHORS=8;
// Four-number study anchors remain valid. Depth and light are optional additions.
export function packLifeAnchors(anchors){
 const valid=anchors.filter(a=>a.length>=4&&a.slice(0,4).every(Number.isFinite)&&a[2]>0).slice(0,MAX_LIFE_ANCHORS);
 const positions=new Float32Array(MAX_LIFE_ANCHORS*4),atmosphere=new Float32Array(MAX_LIFE_ANCHORS*2);
 valid.forEach((anchor,i)=>{
  positions.set(anchor.slice(0,4),i*4);
  atmosphere.set([Number.isFinite(anchor[4])&&anchor[4]>=0?Math.min(1,anchor[4]):-1,Number.isFinite(anchor[5])?Math.max(0,Math.min(1,anchor[5])):1],i*2);
 });
 return {count:valid.length,positions,atmosphere};
}
