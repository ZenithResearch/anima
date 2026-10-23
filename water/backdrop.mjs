import {MirrorBase} from '../scene/mirror-base.js';
import {PondSimulation} from './pond-simulation.mjs';
import {screenToPond,pondExtent} from './pond-field.mjs';
import {fragmentSource,pondFragmentSource} from './backdrop-shader.mjs';
import {resolveWaterView} from './pond-view.mjs';
import {chaliceView} from './chalice-view.mjs';
import {HeadingWaterResponse} from './heading-water-response.mjs';
import {lifeStartAfterHero,LIFE_BAND} from './submerged-life.mjs';
import {TRAIL_COLORS,DEFAULT_TRAIL_COLOR,trailColor} from './trail-colors.mjs';
import {RAIN_COLORS,DEFAULT_RAIN_COLOR,rainColor} from './rain-colors.mjs';
import {KoiWake} from './koi-wake.mjs';
import {packLifeAnchors,MAX_LIFE_ANCHORS} from './life-anchors.mjs';

// Public projection used by interaction and regression checks.
export const screenToBackdrop=screenToPond;
export class WaterBackdrop extends MirrorBase{
 constructor(host){
  super(host);host.removeEventListener('pointermove',this.onPointer);host.removeEventListener('pointerleave',this.onLeave);
  this.events=new AbortController();
  this.lifeStyle=host.dataset.lifeStyle==='pixels'?'pixels':'ascii';host.dataset.lifeStyle=this.lifeStyle;
  this.trailColor=DEFAULT_TRAIL_COLOR;host.dataset.trailColor=this.trailColor;
  this.rainColor=DEFAULT_RAIN_COLOR;host.dataset.rainColor=this.rainColor;
  this.pointerClient=null;this.pointerEligible=false;
  const disturb=source=>{
   if(this.quiet||!this.pointerClient||!this.pointerEligible)return;
   this.contact=screenToBackdrop(...this.pointerClient,host.getBoundingClientRect(),host.ownerDocument.defaultView.scrollY);
   this.contactUntil=performance.now()+100;this.lastInput=source;this.request();
  };
  host.ownerDocument.addEventListener('pointermove',e=>{
   this.pointerClient=[e.clientX,e.clientY];this.pointerEligible=!e.target.closest('a,button,input,textarea,select,summary,dialog,[data-water-controls]');disturb('pointer');
  },{signal:this.events.signal});
  host.ownerDocument.defaultView.addEventListener('scroll',()=>{disturb('scroll');this.request();},{passive:true,signal:this.events.signal});
  this.updateLifeStart=()=>{
   const view=host.ownerDocument.defaultView,hero=host.ownerDocument.querySelector('.hero');
   this.lifeStartPixels=lifeStartAfterHero(hero?hero.getBoundingClientRect().bottom+view.scrollY:0,view.innerHeight);this.request();
   const rim=host.ownerDocument.querySelector('.pool-rim')?.getBoundingClientRect();
   this.rimTop=rim?rim.top+view.scrollY:0;this.rimHeight=rim?.height||0;
  };
  this.updateLifeStart();this.pageResize=new ResizeObserver(this.updateLifeStart);this.pageResize.observe(host.ownerDocument.documentElement);
  this.headings=this.ready?new HeadingWaterResponse(host.ownerDocument):null;
 }
 init(){
  this.waterView=resolveWaterView(this.host.dataset.waterView,new URLSearchParams(this.host.ownerDocument.defaultView.location.search).get('water-view'));
  const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)throw Error('WebGL unavailable');this.gl=gl;this.release();
  const compile=(kind,source)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);return shader;};
  const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}'),fragment=compile(gl.FRAGMENT_SHADER,this.waterView==='pond'?pondFragmentSource:fragmentSource);
  this.program=gl.createProgram();gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);
  const error=gl.getProgramInfoLog(this.program)+' '+gl.getShaderInfoLog(fragment),valid=gl.getProgramParameter(this.program,gl.LINK_STATUS);gl.deleteShader(vertex);gl.deleteShader(fragment);if(!valid)throw Error(error);
  this.locations=Object.fromEntries(['uResolution','uTime','uWater','uPondExtent','uWaterTexel','uFocal','uViewPosition','uViewTarget','uScrollY','uCssWidth','uCssHeight','uLifeStart','uLifeStudy','uLifeCount','uLifeStyle','uLifeAnchors[0]','uLifeAtmosphere[0]','uKoiPose','uKoiMotion','uKoiWakeLight','uKoiWakeHeading','uRimTop','uRimHeight','uTrailCrest','uTrailDepth','uRainLow','uRainMid','uRainHigh'].map(n=>[n,gl.getUniformLocation(this.program,n)]));
  this.position=gl.getAttribLocation(this.program,'aPosition');this.quad=gl.createBuffer();this.resources.push(this.quad);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  this.water=new PondSimulation(gl);this.koiWake=new KoiWake();this.sceneTime=1.4;this.previous=0;this.frameIntervals=[];this.lastDiagnostics=0;this.contact=[0,0];this.pressure=0;this.contactUntil=0;this.ready=true;
  this.host.dataset.renderer='webgl';this.host.dataset.scene=this.waterView==='pond'?'overhead-pond-study':'restored-chalice-water';this.host.dataset.waterView=this.waterView;this.host.dataset.projection='document';
 }
 draw(now){
  this.frame=0;if(!this.ready||this.lost||!this.visible||document.hidden)return;
  const elapsed=this.previous?now-this.previous:0;
  if(elapsed>250)this.frameIntervals=[];
  if(elapsed>0&&elapsed<250&&!this.quiet){this.frameIntervals.push(elapsed);if(this.frameIntervals.length>120)this.frameIntervals.shift();}
  const delta=Math.min(.08,elapsed?elapsed/1000:1/60);this.previous=now;
  if(!this.quiet){this.sceneTime+=delta;this.pressure+=((now<this.contactUntil?1:0)-this.pressure)*(1.-Math.exp(-delta*9.));}
  const r=this.host.getBoundingClientRect();
  if(r.width<1||r.height<1){this.previous=0;return;}
  const gl=this.gl,scale=Math.min(devicePixelRatio||1,1,1280/r.width,900/r.height),w=Math.round(r.width*scale),h=Math.round(r.height*scale);
  this.water.resize(pondExtent(r.width,this.host.ownerDocument.documentElement.scrollHeight));
  const koi=this.koiDriver?.(this.quiet?0:delta,this.contact,this.pressure);
  let koiSize=0;
  for(let i=0;i<(this.lifeAnchorCount||0);i++)if(this.lifeAnchors[i*4+3]===3)koiSize=this.lifeAnchors[i*4+2];
  const wake=koi&&koiSize?this.koiWake.advance(this.quiet?0:delta,koi.pose,koiSize,koi.motion):null;
  if(!wake)this.koiWake.reset();
  this.water.update(now,[...this.contact,this.pressure],this.quiet,wake?this.koiWake.source:null,wake);
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,0,0);
  const l=this.locations,view=chaliceView(r.width,r.height);
  gl.uniform4fv(l.uKoiPose,koi?.pose||[0,0,1,0]);
  gl.uniform4fv(l.uKoiMotion,koi?.motion||[0,0,0,0]);
  gl.uniform4f(l.uKoiWakeLight,this.koiWake.source[0],this.koiWake.source[1],wake?.[0]||0,wake?.[1]||0);
  gl.uniform2f(l.uKoiWakeHeading,wake?this.koiWake.source[2]:1,wake?this.koiWake.source[3]:0);
  const trail=TRAIL_COLORS[this.trailColor||DEFAULT_TRAIL_COLOR];
  gl.uniform3f(l.uTrailCrest,...trail.crest);gl.uniform3f(l.uTrailDepth,...trail.depth);
  const rain=RAIN_COLORS[this.rainColor||DEFAULT_RAIN_COLOR];
  gl.uniform3f(l.uRainLow,...rain.tones[0]);gl.uniform3f(l.uRainMid,...rain.tones[1]);gl.uniform3f(l.uRainHigh,...rain.tones[2]);
  gl.uniform1f(l.uLifeStudy,this.host.hasAttribute('data-life-study')?Math.max(LIFE_BAND,r.height/r.width*8*1.1):0);
  gl.uniform1f(l.uLifeCount,this.lifeAnchorCount||0);
  gl.uniform1f(l.uLifeStyle,this.lifeStyle==='ascii'?0:1);
  gl.uniform4fv(l['uLifeAnchors[0]'],this.lifeAnchors||new Float32Array(MAX_LIFE_ANCHORS*4));
  gl.uniform2fv(l['uLifeAtmosphere[0]'],this.lifeAtmosphere||new Float32Array(MAX_LIFE_ANCHORS*2));
  gl.uniform1f(l.uLifeStart,(this.lifeStartPixels||r.height*1.35)/r.width*8.);
  gl.uniform1f(l.uRimTop,this.rimTop||0);gl.uniform1f(l.uRimHeight,this.rimHeight||0);
  gl.uniform1f(l.uScrollY,this.host.ownerDocument.defaultView.scrollY);gl.uniform1f(l.uCssWidth,r.width);gl.uniform1f(l.uCssHeight,r.height);
  gl.uniform3f(l.uViewPosition,...view.position);gl.uniform3f(l.uViewTarget,...view.target);gl.uniform1f(l.uFocal,view.focal);
  gl.uniform2f(l.uResolution,w,h);gl.uniform1f(l.uTime,this.sceneTime);gl.uniform2f(l.uPondExtent,...this.water.extent);gl.uniform2f(l.uWaterTexel,1/this.water.width,1/this.water.height);
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.water.texture);gl.uniform1i(l.uWater,2);gl.drawArrays(gl.TRIANGLES,0,6);
  this.headings?.update(this.canvas,now,this.quiet);
  // Throttle diagnostic DOM writes; rendering itself stays on every animation frame.
  if(now-this.lastDiagnostics>500||this.quiet){
   this.lastDiagnostics=now;this.host.dataset.time=this.sceneTime.toFixed(3);this.host.dataset.waterSteps=String(this.water.steps);
   if(koi){this.host.dataset.koiPosition=koi.pose.slice(0,2).map(v=>v.toFixed(3)).join(',');this.host.dataset.koiHeading=koi.pose.slice(2).map(v=>v.toFixed(3)).join(',');this.host.dataset.koiWake=(wake?.[1]||0).toFixed(3);}
   this.host.dataset.contact=this.contact.map(v=>v.toFixed(3)).join(',');this.host.dataset.pressure=this.pressure.toFixed(3);this.host.dataset.input=this.lastInput||'none';this.host.dataset.sceneOffset=String(this.host.ownerDocument.defaultView.scrollY);this.host.dataset.lifeStartsAt=String(Math.round(this.lifeStartPixels||0));
   if(this.frameIntervals.length){const times=[...this.frameIntervals].sort((a,b)=>a-b);this.host.dataset.frameMedian=times[Math.floor(times.length*.5)].toFixed(1);this.host.dataset.frameP95=times[Math.min(times.length-1,Math.floor(times.length*.95))].toFixed(1);}
  }
  if(!this.quiet)this.request();else this.host.dataset.animating='false';
 }
 setQuiet(value){super.setQuiet(value);this.previous=0;this.contactUntil=0;this.pressure=0;}
 setLifeStyle(style){this.lifeStyle=style==='pixels'?'pixels':'ascii';this.host.dataset.lifeStyle=this.lifeStyle;this.request();}
 setKoiDriver(driver){this.koiDriver=driver;if(this.program)this.request();}
 setTrailColor(id){this.trailColor=trailColor(id);this.host.dataset.trailColor=this.trailColor;this.request();return this.trailColor;}
 setRainColor(id){this.rainColor=rainColor(id);this.host.dataset.rainColor=this.rainColor;this.request();return this.rainColor;}
 setLifeAnchors(anchors){
  const packed=packLifeAnchors(anchors);
  this.lifeAnchorCount=packed.count;this.lifeAnchors=packed.positions;this.lifeAtmosphere=packed.atmosphere;
  this.host.dataset.lifeAnchors=String(this.lifeAnchorCount);this.request();
 }
 cancel(){this.previous=0;this.frameIntervals=[];this.water?.pause();super.cancel();}
 release(){this.water?.destroy();this.water=null;super.release();}
 destroy(){this.events.abort();this.pageResize.disconnect();this.headings?.destroy();super.destroy();}
}
