// Measure actual travel, so a turning/paused fish cannot leave an artificial
// spinning wake. A layout jump starts a fresh source rather than sweeping water.
export class KoiWake {
 constructor(){this.previous=null;this.strength=0;this.value=new Float32Array(4);this.source=new Float32Array(4);}
 advance(delta,pose,size,motion){
  if(delta<=0)return this.value;
  const distance=this.previous?Math.hypot(pose[0]-this.previous[0],pose[1]-this.previous[1]):0;
  const speed=distance/delta/Math.max(.01,size);
  const valid=this.previous&&Math.abs(size-this.previous[2])<.001&&distance<size*.12&&speed<1.5;
  const target=valid?Math.min(.6,speed*12)*(.55+motion[1]*.45):0;
  this.strength=valid?this.strength+(target-this.strength)*(1-Math.exp(-delta*3)):0;
  this.previous=[pose[0],pose[1],size];
  const length=Math.hypot(pose[2],pose[3])||1;
  const fx=pose[2]/length,fy=pose[3]/length;
  // koiShape maps the nose to +.184 body units along the heading. Keep
  // translation separate from rotation: the bow source belongs to the head.
  this.source.set([pose[0]+fx*size*.184,pose[1]+fy*size*.184,fx,fy]);
  this.value.set([size,this.strength,motion[0],motion[2]]);return this.value;
 }
 reset(){this.previous=null;this.strength=0;this.value.fill(0);this.source.fill(0);}
}
