import type {CoreExports} from './core.js';
type Step=NonNullable<CoreExports['koi_step']>;
type State=[number,number,number,number];
// Fixed-step state, independently testable without a DOM or a graphics context.
export class KoiSwim {
 state:State=[.24,.08,.11,.04];
 goal:[number,number]=[-.72,.65];
 phase=0;amplitude=.4;turn=0;time=0;
 private remainder=0;private timer=8;private wallTurn=0;private seed:number;
 constructor(private step:Step,seed:number){this.seed=seed||1;}
 private random():number {
  let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;
  return this.seed/4294967296;
 }
 advance(delta:number,px:number,py:number,pressure:number):void {
  this.remainder+=Math.min(.08,Math.max(0,delta));
  const h=1/120;
  while(this.remainder+1e-10>=h){
   this.remainder-=h;this.time+=h;this.timer-=h;this.wallTurn-=h;
   const [x,y,vx,vy]=this.state;
   const aheadX=x+vx*2.4,aheadY=y+vy*2.4;
   if(this.wallTurn<=0&&(Math.abs(aheadX)>.64||Math.abs(aheadY)>.64)){
    this.goal=[Math.abs(aheadX)>.64?(aheadX>0?-.78:.78):(this.random()-.5)*1.4,Math.abs(aheadY)>.64?(aheadY>0?-.78:.78):(this.random()-.5)*1.4];
    this.wallTurn=4;this.timer=8;
   }else if(this.timer<=0||Math.hypot(this.goal[0]-x,this.goal[1]-y)<.15){
    this.goal=[(this.random()-.5)*1.7,(this.random()-.5)*1.7];
    if(Math.hypot(this.goal[0]-x,this.goal[1]-y)<.7)this.goal[0]=x>0?-.8:.8;
    this.timer=8+this.random()*7;
   }
   // A short powered stroke followed by a longer glide; speed has inertia.
   const stroke=Math.pow(.5+.5*Math.sin(this.time*1.6),3);
   const next=[0,1,2,3].map(i=>this.step(i,x,y,vx,vy,...this.goal,px,py,pressure,.095+.035*stroke,h)) as State;
   const speed=Math.hypot(next[2],next[3]);
   const curvature=(vx*next[3]-vy*next[2])/Math.max(.001,Math.hypot(vx,vy)*speed)/h;
   this.turn+=(Math.max(-1,Math.min(1,curvature)) -this.turn)*(1-Math.exp(-h*6));
   this.amplitude+=(.22+.45*stroke-this.amplitude)*(1-Math.exp(-h*3));
   this.phase+=h*(2.25+speed*5.2);this.state=next;
  }
 }
}
