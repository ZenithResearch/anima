import {submergedLifeGLSL} from './submerged-life.mjs';
import {pondMaterialGLSL} from './pond-view.mjs';
// Restored chalice ground-water material and palette. No sculpture, ring lights,
// narrow reflected strips or replacement colour treatment. One original broad key.
function backdropFragment(topDown=false){return `${topDown?'#define ANIMA_POND_VIEW\n':''}precision highp float;
varying vec2 vUV;
uniform vec2 uResolution,uPondExtent,uWaterTexel;
uniform float uTime,uFocal,uScrollY,uCssWidth,uCssHeight,uRimTop,uRimHeight;
uniform vec3 uViewPosition,uViewTarget;
uniform vec3 uTrailCrest,uTrailDepth;
uniform sampler2D uWater;
uniform vec4 uKoiWakeLight;
uniform vec2 uKoiWakeHeading;
float sq(float x){return x*x;}
float unpack(vec2 v){return (dot(floor(v*255.+.5),vec2(256.,1.))-32768.)/32767.*.08;}
vec2 waterTexel(vec2 uv){
 vec4 value=texture2D(uWater,uv);
 return vec2(unpack(value.rg),unpack(value.ba)*2.25);
}
vec2 waterState(vec2 p){
 vec2 uv=vec2(p.x/uPondExtent.x+.5,p.y/uPondExtent.y);
 vec2 cell=uv/uWaterTexel-.5,base=floor(cell),f=fract(cell),a=(base+.5)*uWaterTexel;
 return mix(mix(waterTexel(a),waterTexel(a+vec2(uWaterTexel.x,0.)),f.x),mix(waterTexel(a+vec2(0.,uWaterTexel.y)),waterTexel(a+uWaterTexel),f.x),f.y);
}
float heightAt(vec2 p){return waterState(p).x;}
vec2 wave(vec2 p,vec2 direction,float frequency,float amplitude,float speed,float phase){
 float a=dot(p,direction)*frequency-uTime*speed+phase;
 return direction*(frequency*amplitude*cos(a));
}
vec2 pondSlope(vec2 p,out vec2 response){
 // Crossing long waves: small surface slopes, slow travel, no radial falloff.
 vec2 w=p+vec2(.22*sin(p.y*.63),.30*sin(p.x*.71+p.y*.14));
 #ifdef ANIMA_POND_VIEW
 // A few widely separated directions interrupt the old camera's parallel
 // bands. Equal x/y scale lets these read as small intersecting pond swells.
 vec2 g=wave(w,vec2(.60,.80),3.5,.007,.08,.7);
 g+=wave(w,vec2(-.88,.475),5.2,.004,.09,2.1);
 g+=wave(w,vec2(.21,.978),7.8,.002,.11,4.3);
 g+=wave(w,vec2(.91,-.414),12.1,.0005,.13,1.8);
 #else
 vec2 g=wave(w,vec2(.15,.9887),4.3,.007,.08,.7);
 g+=wave(w,vec2(.30,.9539),7.8,.002,.11,2.1);
 g+=wave(w,vec2(-.40,.9165),2.2,.007,.065,4.3);
 g+=wave(w,vec2(.05,.9987),15.3,.00035,.14,1.8);
 g+=wave(w,vec2(.20,.9798),29.7,.00022,.17,5.2);
 #endif
 vec2 e=uPondExtent*uWaterTexel;
 response=vec2((heightAt(p+vec2(e.x,0.))-heightAt(p-vec2(e.x,0.)))/(2.*e.x),(heightAt(p+vec2(0.,e.y))-heightAt(p-vec2(0.,e.y)))/(2.*e.y));
 g+=response;
 return g;
}
vec3 bioluminescence(vec2 p,vec2 slope,vec2 response){
 // Light belongs to the moving water: the height-field slopes trace each
 // propagating ripple, and local vertical velocity illuminates its depth.
 vec2 submerged=waterState(p+slope*.055+vec2(-.018,.025));
 float shear=length(response);
 float crest=pow(smoothstep(.0015,.075,shear),1.35);
 float depth=1.-exp(-abs(submerged.y)*13.);
 // Continuous soft emission within the water; no particle grid,
 // cursor-distance mask, painted circles, time-only twinkle or floating dots.
 vec3 emission=uTrailCrest*crest+uTrailDepth*depth;
 // A broad submerged sensitivity region follows the bow; only actual height-
 // field shear and vertical velocity can light it. No path stroke is drawn.
 if(uKoiWakeLight.w>0.){
  vec2 forward=normalize(uKoiWakeHeading),right=vec2(-forward.y,forward.x);
  vec2 delta=(p-uKoiWakeLight.xy)/max(.01,uKoiWakeLight.z);
  float along=dot(delta,forward),across=dot(delta,right);
  float region=exp(-sq(across/.42)-sq((along+.24)/.70))*(1.-smoothstep(.04,.26,along));
  float waterEnergy=1.-exp(-shear*42.-abs(submerged.y)*24.);
  emission+=vec3(.42,.13,.48)*waterEnergy*region*smoothstep(0.,.20,uKoiWakeLight.w)*.38;
 }
 return emission;
}
vec3 environment(vec3 d){
 // Broad, curved sources reflected by the water rather than painted onto it.
 vec3 dark=vec3(.12,.075,.155);
 vec3 light=mix(dark,vec3(.37,.28,.43),smoothstep(-.3,1.,d.y)*.55);
 float key=exp(-sq((d.x+.62)*2.7)-sq((d.y-.58)*2.3));
 light+=vec3(.72,.77,.86)*key*.85;
 // The original broad opening remains; only its narrow trace/strip lights are gone.
 vec2 sky=d.xz/max(d.y,.22);
 float opening=exp(-sq((sky.x+.18*sin(sky.y*.75)+.20)*5.5));
 light+=vec3(.58,.66,.75)*opening*.78*smoothstep(.03,.30,d.y);
 return light;
}

${submergedLifeGLSL}
${pondMaterialGLSL}
vec3 ground(vec3 p,vec3 rd,vec2 surface,vec2 response){
 // The original chalice ground colour, lighting mix and shallow-water normals.
 float r=length(p.xz);
 float ripple=sin(r*17.-uTime*.90)*exp(-r*.65)*.023;
 vec2 slope=response*.50+normalize(p.xz+.001)*ripple+vec2(sin(p.z*8.+uTime*.25),cos(p.x*7.-uTime*.30))*.009;
 vec3 n=normalize(vec3(-slope.x,1.,-slope.y));
 vec3 reflection=reflect(rd,n);
 vec3 waterBody=vec3(.052,.029,.078)+submergedLife(surface,slope,response);
 vec3 reflectedLight=environment(reflection)*.38+distantMoon(surface,n,rd);
 vec3 color=mix(waterBody,reflectedLight,.44);
 color+=vec3(.24,.12,.30)*exp(-r*r*.28)*.12;
 color=mix(environment(rd)*.60,color,exp(-min(r,8.)*.045));
 // The responsive glow is the existing submerged simulation, not a particle overlay.
 color+=bioluminescence(surface,slope,response)*.46;
 return color;
}
void main(){
 float documentY=(1.-vUV.y)*uCssHeight+uScrollY;
 float row=documentY/uCssHeight;
 vec2 uv=vec2((vUV.x-.5)*uCssWidth/uCssHeight,.5-row);
 vec3 ro=uViewPosition;
 vec3 forward=normalize(uViewTarget-ro),right=normalize(cross(forward,vec3(0.,1.,0.))),up=cross(right,forward);
 vec3 ray=normalize(forward*uFocal+right*uv.x+up*uv.y);
 vec2 surface=vec2((vUV.x-.5)*8.,documentY/uCssWidth*8.);
 vec2 response;
 vec2 surfaceSlope=pondSlope(surface,response);
 #ifdef ANIMA_POND_VIEW
 vec3 color=overheadPond(surface,surfaceSlope,response);
 #else
 vec3 color=environment(ray)*.60;
 float pool=ray.y<-.001?-ro.y/ray.y:100.;
 if(pool<60.){
  vec3 point=ro+ray*pool;
  if(row>1.){
   // Continue beyond the original camera's bottom edge as a full-length sheet,
   // rather than squeezing distant document rows into a fixed screen image.
   vec3 bottomRay=normalize(forward*uFocal+right*uv.x-up*.5);
   point=ro+bottomRay*(-ro.y/bottomRay.y);
   point.z+=(row-1.)*8.*uCssHeight/uCssWidth;
  }
  color=ground(point,ray,surface,response);
 }
 float halo=exp(-dot((uv-vec2(.0,.10))*vec2(.8,1.1),(uv-vec2(.0,.10))*vec2(.8,1.1))*5.);
 color+=vec3(.06,.028,.085)*halo*.22;
 vec2 edge=vec2(vUV.x-.5,clamp(.5-row,-.5,.5));
 color*=1.-.19*dot(edge,edge);
 #endif
 // The near edge holds the same live sheet. Match the SVG's cubic inner lip,
 // then let its foreground water catch the existing broad environment light.
 float lo=0.,hi=1.;
 for(int i=0;i<9;i++){
  float t=(lo+hi)*.5,s=1.-t;
  float x=-80.*s*s*s+900.*s*s*t+3420.*s*t*t+1520.*t*t*t;
  if(x<vUV.x*1440.)lo=t;else hi=t;
 }
 float t=(lo+hi)*.5;
 float lipY=uRimTop+(6.+552.*t*(1.-t))*uRimHeight/210.;
 float inside=lipY-documentY;
 if(uRimHeight>0.&&inside>=0.){
  float nearEdge=1.-smoothstep(0.,min(uCssWidth*.42,440.),inside);
  vec3 normal=normalize(vec3(-surfaceSlope.x*2.0,1.,-surfaceSlope.y*2.0));
  vec3 viewRay=normalize(vec3(-.36+(vUV.x-.5)*.45,-.48,-1.));
  vec3 reflected=environment(reflect(viewRay,normal));
  vec3 wet=vec3(.052,.029,.078)*.56+reflected*.26;
  wet+=bioluminescence(surface,surfaceSlope,response)*.46;
  wet+=submergedLife(surface,surfaceSlope,response)*.56;
  color=mix(color,wet,nearEdge*.82);
  // A fine contact meniscus joins the water to the metal, not a separate stripe.
  color+=vec3(.16,.10,.19)*exp(-inside/2.2)*.20;
 }
 gl_FragColor=vec4(clamp(color,0.,1.),1.);
}
`;}
export const fragmentSource=backdropFragment();
export const pondFragmentSource=backdropFragment(true);
