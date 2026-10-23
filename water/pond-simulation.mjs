import {pondGrid} from './pond-field.mjs';
import {PondMotion} from './pond-motion.mjs';
// Landing-only rectangular height/velocity field. The original mirror solver is untouched.
const vertex=`attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 vUV;
uniform sampler2D uState;
uniform vec2 uTexel,uExtent;
uniform vec3 uContact;
uniform vec4 uSwimmer,uSwimmerWake;
uniform float uDelta;
float unpack16(vec2 v){return (dot(floor(v*255.+.5),vec2(256.,1.))-32768.)/32767.;}
vec2 pack16(float v){float n=floor(clamp(v,-1.,1.)*32767.+32768.+.5);return vec2(floor(n/256.),mod(n,256.))/255.;}
float heightAt(vec2 uv){return unpack16(texture2D(uState,uv).rg)*.08;}
void main(){
 vec4 state=texture2D(uState,vUV);float h=unpack16(state.rg)*.08,v=unpack16(state.ba)*.18;
 vec2 cell=uExtent*uTexel;
 float lap=(heightAt(vUV+vec2(uTexel.x,0.))+heightAt(vUV-vec2(uTexel.x,0.))-2.*h)/(cell.x*cell.x)
          +(heightAt(vUV+vec2(0.,uTexel.y))+heightAt(vUV-vec2(0.,uTexel.y))-2.*h)/(cell.y*cell.y);
 vec2 p=vec2((vUV.x-.5)*uExtent.x,vUV.y*uExtent.y),d=p-uContact.xy;
 // Small pressure displaces water; the released surface propagates and settles.
 float fishForce=0.;
 if(uSwimmerWake.y>0.){
  vec2 forward=uSwimmer.zw,right=vec2(-forward.y,forward.x);
  vec2 q=vec2(dot(p-uSwimmer.xy,right),dot(p-uSwimmer.xy,forward))/max(.01,uSwimmerWake.x);
  // Continuous pressure at the nose, not periodic impacts at the tail.
  // A narrow raised bow and a displaced trough keep the source balanced.
  float ahead=(q.y-.018)/.045,behind=(q.y+.037)/.055;
  float bow=exp(-q.x*q.x/.0049)*(exp(-ahead*ahead)-(.045/.055)*exp(-behind*behind));
  // Two oblique crest/trough pairs peel off the shoulders and open aft.
  // Old water keeps propagating after the source has moved or turned.
  float aft=-q.y;
  float opening=.034+.43*max(0.,aft);
  float across=abs(q.x)-opening;
  // Filter the narrow arms to the simulation cell footprint at small sizes.
  float width=max(.036,length(cell)/max(.01,uSwimmerWake.x)*.7);
  float crest=exp(-pow(across/width,2.));
  float trough=exp(-pow((across-width*1.9)/(width*1.36),2.));
  float envelope=smoothstep(-.015,.070,aft)*exp(-max(0.,aft)/.34)*(1.-smoothstep(.64,.90,aft));
  float shoulders=(crest-trough/1.36)*envelope;
  fishForce=uSwimmerWake.y*(.40*bow+.28*shoulders);
 }
 v=(v+(.42*.42*lap-.65*uContact.z*exp(-dot(d,d)/.0256)+fishForce)*uDelta)*exp(-1.4*uDelta);
 h=clamp(h+v*uDelta,-.06,.06);
 gl_FragColor=vec4(pack16(h/.08),pack16(v/.18));
}`;
export class PondSimulation{
 constructor(gl){
  this.gl=gl;this.motion=new PondMotion();this.targets=[];this.steps=0;this.clock=0;this.remainder=0;
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);return s;};
  const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);
  this.program=gl.createProgram();gl.attachShader(this.program,v);gl.attachShader(this.program,f);gl.linkProgram(this.program);
  const valid=gl.getProgramParameter(this.program,gl.LINK_STATUS),error=gl.getProgramInfoLog(this.program)+' '+gl.getShaderInfoLog(f);
  gl.deleteShader(v);gl.deleteShader(f);if(!valid)throw Error(error);
  this.locations=Object.fromEntries(['uState','uTexel','uExtent','uContact','uDelta','uSwimmer','uSwimmerWake'].map(n=>[n,gl.getUniformLocation(this.program,n)]));
  this.position=gl.getAttribLocation(this.program,'aPosition');this.quad=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 }
 resize(extent){
  if(this.extent?.every((v,i)=>Math.abs(v-extent[i])<.001))return;
  const gl=this.gl;for(const t of this.targets){gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.buffer);}
  this.extent=extent;[this.width,this.height]=pondGrid(extent);
  const blank=new Uint8Array(this.width*this.height*4);for(let i=0;i<blank.length;i+=4){blank[i]=128;blank[i+2]=128;}
  this.targets=[0,1].map(()=>{
   const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.width,this.height,0,gl.RGBA,gl.UNSIGNED_BYTE,blank);
   const buffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,buffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Pond target unavailable');return {texture,buffer};
  });gl.bindFramebuffer(gl.FRAMEBUFFER,null);this.pause();
 }
 get texture(){return this.targets[0].texture;}
 pause(){this.clock=0;this.remainder=0;this.motion.reset();}
 update(now,contact,quiet,swimmer=null,wake=null){
  if(quiet){this.pause();return;}
  this.remainder+=this.clock?Math.min(now-this.clock,80):16.7;this.clock=now;
  const step=1/120,count=Math.min(10,Math.floor(this.remainder/(1000*step)));this.remainder-=count*1000*step;
  const gl=this.gl,l=this.locations;gl.disable(gl.BLEND);gl.viewport(0,0,this.width,this.height);gl.useProgram(this.program);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,0,0);
  gl.uniform2f(l.uTexel,1/this.width,1/this.height);gl.uniform2f(l.uExtent,...this.extent);gl.uniform3f(l.uContact,...contact);gl.uniform1f(l.uDelta,step);gl.uniform1i(l.uState,2);
  this.motion.begin(swimmer,wake);
  for(let i=0;i<count;i++){
   // Integrate the moving source at the middle of each 120 Hz time slice.
   const source=this.motion.sample((i+.5)/count);
   gl.uniform4fv(l.uSwimmer,source.pose);gl.uniform4fv(l.uSwimmerWake,source.wake);
   gl.bindFramebuffer(gl.FRAMEBUFFER,this.targets[1].buffer);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.drawArrays(gl.TRIANGLES,0,6);this.targets.reverse();this.steps++;
  }
  if(count)this.motion.commit();
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 }
 destroy(){const gl=this.gl;for(const t of this.targets){gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.buffer);}gl.deleteBuffer(this.quad);gl.deleteProgram(this.program);this.targets=[];}
}
