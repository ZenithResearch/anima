// Sweep the bow through the solver's fixed steps instead of stamping the latest
// render-frame position repeatedly. Snap only on a new source or layout jump.
export class PondMotion {
 constructor(){this.reset();this.pose=new Float32Array(4);this.wake=new Float32Array(4);}
 reset(){this.previous=null;}
 begin(pose,wake){
  const current=pose&&wake?{pose:[...pose],wake:[...wake]}:null;
  const previous=this.previous;
  const size=current?.wake[0]||0;
  const continuous=current&&previous&&size>0&&previous.wake[0]>0&&
   Math.abs(size-previous.wake[0])<.001&&
   Math.hypot(current.pose[0]-previous.pose[0],current.pose[1]-previous.pose[1])<size*.12;
  this.from=continuous?previous:current;this.current=current;
 }
 sample(fraction){
  if(!this.current){this.pose.set([0,0,1,0]);this.wake.fill(0);return this;}
  const a=this.from,b=this.current,t=Math.max(0,Math.min(1,fraction));
  this.pose[0]=a.pose[0]+(b.pose[0]-a.pose[0])*t;
  this.pose[1]=a.pose[1]+(b.pose[1]-a.pose[1])*t;
  // Interpolate the shortest turn without collapsing the heading at a half-turn.
  const angle=Math.atan2(a.pose[3],a.pose[2]);
  const turn=Math.atan2(a.pose[2]*b.pose[3]-a.pose[3]*b.pose[2],a.pose[2]*b.pose[2]+a.pose[3]*b.pose[3]);
  this.pose[2]=Math.cos(angle+turn*t);this.pose[3]=Math.sin(angle+turn*t);
  for(let i=0;i<4;i++)this.wake[i]=a.wake[i]+(b.wake[i]-a.wake[i])*t;
  return this;
 }
 commit(){this.previous=this.current;}
}
