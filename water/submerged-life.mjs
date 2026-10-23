import {proceduralLifeGLSL} from './life-shapes.mjs';
import {MAX_LIFE_ANCHORS} from './life-anchors.mjs';

export const LIFE_SPECIES=Object.freeze(['pisces','jellyfish','ray','koi']);
// Experimental identities are opt-in anchors; the live pond distribution stays intact.
export const STUDY_LIFE_SPECIES=Object.freeze([...LIFE_SPECIES,'sea-angel','betta','anemone','seaweed']);
export const LIFE_GRID=Object.freeze({glyphs:'.:+*ox#~',cellWidth:6.5,cellHeight:9.75,pixelWidth:4});
export const LIFE_BAND=9;
export function lifeStartAfterHero(heroBottom,viewportHeight){return Math.max(heroBottom,viewportHeight*1.35);}

export const submergedLifeGLSL=`
uniform float uLifeStart,uLifeStudy,uLifeCount,uLifeStyle;
uniform vec4 uLifeAnchors[${MAX_LIFE_ANCHORS}];
uniform vec2 uLifeAtmosphere[${MAX_LIFE_ANCHORS}];
uniform vec4 uKoiPose,uKoiMotion;
uniform vec3 uRainLow,uRainMid,uRainHigh;
float lifeHash(float p){return fract(sin(p*127.1+311.7)*43758.5453);}
${proceduralLifeGLSL}
float lifeColumns(){return uLifeStyle>.5?clamp(floor(uCssWidth/${LIFE_GRID.pixelWidth.toFixed(1)}),64.,400.):clamp(floor(uCssWidth/${LIFE_GRID.cellWidth.toFixed(1)}),48.,240.);}
float lifeRain(vec2 index,vec2 surface){
 // Light travels down existing document-space cells; scrolling reveals the
 // same stream rather than restarting a screen-sized layer of falling text.
 float seed=lifeHash(index.x+93.7);
 float period=96.+floor(seed*71.);
 float head=uTime*(1.35+seed*1.4)+lifeHash(index.x+171.)*period;
 float age=mod(head-index.y+period,period);
 float tail=14.+seed*18.;
 float stream=exp(-age/(6.+seed*9.))*(1.-smoothstep(tail*.65,tail,age));
 float sparse=smoothstep(.48,.76,lifeHash(index.x+47.));
 // Left-led in the upper water, widening gently through later chapters.
 // A depth floor keeps rain present through the closing invitation and rim.
 float depth=max(0.,surface.y);
 float left=1.-smoothstep(-2.7,1.,surface.x);
 float upper=exp(-depth*.08);
 float placement=mix(.62+.38*left,.16+.84*left,upper);
 float submerged=.72+.28*exp(-depth*.025);
 return stream*sparse*placement*submerged;
}
vec3 lifeFieldLight(vec3 emission,vec3 fieldLight,float ink,vec2 cellUV,float aa,float reveal,float grain,float detail){
 if(uLifeStyle>.5)return fieldLight+ink*emission*reveal*.68;
 // Light density describes the body, rather than leaving random dot-sized
 // holes through the fish. The resting lattice remains a fixed faint field.
 float level=max(detail,max(emission.r,max(emission.g,emission.b)));
 float glyph=level>.30?(grain>.35?6.:3.):level>.14?(grain>.5?3.:4.):level>.05?2.:1.;
 float bodyInk=fieldInk(cellUV,glyph,aa*.85);
 return fieldLight+bodyInk*emission*reveal*2.6;
}
// Shared animation/material for both the original field and curated clearings.
vec3 lifeAt(vec2 surface,vec2 slope,vec2 response,float id,vec2 center,float size,float species,float depth){
 float seed=lifeHash(id+7.);
  // Greater depth means greater refractive displacement and softer glyph edges.
  vec2 local=(surface+slope*(.4+depth*.8)-center)/size;
  float angle=(seed-.5)*.65;
  if(species>2.5&&species<3.5&&uKoiMotion.w>.5){local=(surface+slope*(.4+depth*.8)-uKoiPose.xy)/size;angle=0.;}
  if(species>.5&&species<1.5){
   // A bounded current carries the whole animal through its clearing. The
   // contraction adds a small upward stroke; tentacles lag in jellyShape.
   float journey=uTime*.24+seed*6.283185;
   local-=vec2(.17*sin(journey),.12*sin(journey*1.37+.8)-.055*jellyStroke(seed));
   angle+=.13*cos(journey)+.035*sin(uTime*1.34+seed*9.);
  }else if(species>1.5&&species<2.5){
   float journey=uTime*.14+seed*6.283185;
   // A non-stalling elliptical cruise: heading is the path tangent, so the
   // animal glides through broad turns instead of pivoting at a turnaround.
   local-=vec2(.18*sin(journey),.13*cos(journey));
   vec2 velocity=vec2(.18*cos(journey),-.13*sin(journey));
   angle=atan(velocity.x,-velocity.y);
  }
  if(species>3.5&&species<4.5){
   float drift=uTime*.12+seed*6.283185;
   local-=vec2(.11*sin(drift),.085*cos(drift*.83)-.025*sin(uTime*1.12));
   angle=.15*sin(drift*.71)+.04*sin(uTime*.53);
  }
  if(species>4.5&&species<5.5){
   float drift=uTime*.16+seed*5.;
   local-=vec2(.16*sin(drift),.10*cos(drift));
   vec2 velocity=vec2(.16*cos(drift),-.10*sin(drift));
   angle=atan(-velocity.y,-velocity.x);
  }
  if(species>5.5)angle=0.;
  mat2 frame=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
  local=frame*local;
  if(max(abs(local.x),abs(local.y))>.78)return vec3(0.);
  float gridStep=8./lifeColumns();
  float blur=max(.003,gridStep/size*.42);
  // Keep the light fixed in pond space while animal frames turn and bank.
  vec3 light=normalize(vec3(-.48,-.60,.75));light.xy=frame*light.xy;
  vec3 pigment=mix(vec3(.60,.28,.46),vec3(.46,.29,.61),seed);
  vec3 animal;
  if(species<.5){
   vec2 pair=piscesShape(local,seed,blur,light);
   // Stable identities follow the orbit: pearl-lilac and deeper luminous plum.
   animal=(pair.x*vec3(.86,.62,.78)+pair.y*vec3(.506,.264,.55))*1.12;
  }else if(species<1.5)animal=jellyShape(local/.82+vec2(0.,.20),seed,blur/.82,light);
  else if(species<2.5)animal=mix(vec3(.57,.28,.50),vec3(.47,.33,.64),seed)*rayShape(local/.86+vec2(0.,.14),seed,blur/.86,light);
  else if(species<3.5)animal=koiShape(local,seed,blur,light);
  else if(species<4.5)animal=seaAngelShape(local,seed,blur,light);
  else if(species<5.5)animal=bettaShape(local,seed,blur,light);
  else if(species<6.5)animal=anemoneShape(local,seed,blur,light);
  else {
   // A slender distant kelp stand fits the narrow-screen service-list margin.
   float spread=mix(.60,1.,smoothstep(750.,751.,uCssWidth));
   animal=seaweedShape(vec2(local.x/spread,local.y),seed,blur,light);
  }
  float breath=.90+.10*sin(uTime*.17+seed*17.);
  if(species>.5&&species<1.5)breath*=.97+.035*jellyStroke(seed);
  float disturbed=clamp(length(response)*7.,0.,.45);
  // These organisms emit wine/plum light below the reflective water layer.
  return animal*1.45*(1.-depth*.54)*(breath+disturbed);
}
vec3 submergedLife(vec2 surface,vec2 slope,vec2 response){
 // One continuous lattice in document coordinates, including the quiet water
 // around every organism. Refraction bends the field as one submerged sheet.
 float columns=lifeColumns();
 vec2 cell=vec2(8./columns,(uLifeStyle>.5?1.:${(LIFE_GRID.cellHeight/LIFE_GRID.cellWidth).toFixed(2)})*8./columns);
 vec2 refractedSlope=slope;
 #ifdef ANIMA_POND_VIEW
 // Bound refraction to a fraction of one character. The whole underwater
 // lattice bends continuously without tearing silhouettes or shifting their
 // layout envelopes into actions. Depth below adds a second, smaller offset.
 vec2 refractionLimit=cell*.55;
 vec2 relativeSlope=slope/refractionLimit;
 refractedSlope=slope/sqrt(vec2(1.)+relativeSlope*relativeSlope);
 #endif
 vec2 field=surface+refractedSlope*.38,index=floor(field/cell);
 // Both views sample the moving, shaded body at fixed cell centres.
 vec2 sampleSurface=(index+.5)*cell;
 float grain=lifeHash(index.x+index.y*173.17);
 float glyph=floor(grain*${LIFE_GRID.glyphs.length.toFixed(1)});
 vec2 cellUV=fract(field/cell);
 float aa=.55*columns/uResolution.x;
 float square=1.-smoothstep(.39-aa*.5,.39+aa*.5,max(abs(cellUV.x-.5),abs(cellUV.y-.5)));
 float ink=uLifeStyle>.5?square:fieldInk(cellUV,glyph,aa);
 // Rain is a slightly deeper refracted layer. Only the live water's height,
 // slope and velocity can disturb it; there is no cursor-distance mask.
 vec2 water=waterState(surface);
 vec2 bend=response*.60+vec2(.55,-.80)*water.x;
 vec2 normalizedBend=bend/(cell*.35);
 bend=bend/sqrt(vec2(1.)+normalizedBend*normalizedBend);
 vec2 rainField=field+bend,rainIndex=floor(rainField/cell);
 vec2 rainUV=fract(rainField/cell),rainSurface=(rainIndex+.5)*cell;
 float rainGrain=lifeHash(rainIndex.x+rainIndex.y*173.17);
 float rainGlyph=floor(rainGrain*${LIFE_GRID.glyphs.length.toFixed(1)});
 float rainSquare=1.-smoothstep(.39-aa*.5,.39+aa*.5,max(abs(rainUV.x-.5),abs(rainUV.y-.5)));
 float rainInk=uLifeStyle>.5?rainSquare:fieldInk(rainUV,rainGlyph,aa);
 float rain=lifeRain(rainIndex,rainSurface);
 float hue=lifeHash(floor(rainIndex.x*.33)+357.);
 vec3 rainTone=mix(uRainLow,uRainMid,smoothstep(.20,.80,hue));
 rainTone=mix(rainTone,uRainHigh,pow(rain,3.)*.30);
 // A capped 6% lift catches travelling ripples without spawning extra marks.
 float stirred=1.-exp(-length(response)*18.-abs(water.y)*16.);
 // The first screen is the ceiling everywhere; depth never raises this gain.
 // Ripple response can redistribute faint light but cannot exceed that ceiling.
 float rainStrength=min(.65,.65*rain*(1.+.06*stirred));
 vec3 resting=(ink*vec3(.040,.022,.050)*(.78+.22*grain)+
  rainInk*rainTone*rainStrength*(.78+.22*rainGrain))*(uLifeStyle>.5?.15:1.);
 float reveal=smoothstep(uLifeStart,uLifeStart+1.6,surface.y);
 float spacing=uLifeStudy>.5?uLifeStudy:${LIFE_BAND.toFixed(1)};
 float band=floor((surface.y-uLifeStart)/spacing);
 vec3 emission=vec3(0.);
 float detail=0.;
 if(uLifeCount>.5){
  for(int i=0;i<${MAX_LIFE_ANCHORS};i++){
   if(float(i)>=uLifeCount)break;
   vec4 anchor=uLifeAnchors[i];
   if(anchor.z<=0.)continue;
   // Distant studies are local to a small patch of water; skip their anatomy
   // outside that patch rather than evaluating every animal over every pixel.
   if(abs(anchor.w-3.)>.1&&max(abs(sampleSurface.x-anchor.x),abs(sampleSurface.y-anchor.y))>anchor.z*1.1)continue;
   // Curated clearings own their placement, including the explicit hero room.
   float presence=anchor.y<uLifeStart?.80:1.;
   vec2 atmosphere=uLifeAtmosphere[i];
   float depth=atmosphere.x<0.?.38+.18*lifeHash(anchor.w+21.):atmosphere.x;
   vec2 depthRefraction=vec2(0.);
   #ifdef ANIMA_POND_VIEW
   depthRefraction=refractedSlope*.30;
   #endif
   vec3 body=lifeAt(sampleSurface,depthRefraction,response,anchor.w,anchor.xy,anchor.z,anchor.w,depth)*presence;
   emission+=body*atmosphere.y;
   // Distance dims the organism, not the amount of its silhouette that exists.
   // Keep the faint fins/tentacles readable instead of reducing them to colons.
   float density=atmosphere.y<.6?mix(atmosphere.y,1.,.70):atmosphere.y;
   detail=max(detail,max(body.r,max(body.g,body.b))*density);
  }
  return lifeFieldLight(emission,resting,ink,cellUV,aa,1.,grain,detail);
 }
 if(reveal<=0.)return resting;
 for(int neighbour=-1;neighbour<=1;neighbour++){
  float id=band+float(neighbour);
  if(id<0.)continue;
  float seed=lifeHash(id+7.);
  float species=mod(id,${LIFE_SPECIES.length.toFixed(1)});
  float depth=.30+.55*lifeHash(id+21.);
  float size=mix(1.7,2.7,lifeHash(id+3.))*(1.-depth*.20);
  vec2 center=vec2((lifeHash(id+11.)-.5)*5.6,uLifeStart+id*${LIFE_BAND.toFixed(1)}+2.4+lifeHash(id+2.)*3.2);
  if(id<.5)center=vec2(2.10,uLifeStart+3.4);
  // The separate viewing page stages each life away from copy.
  // Uncurated water pages retain their original document-space placement.
  if(uLifeStudy>.5&&id<3.5)center=vec2(id<.5?2.10:id<1.5?1.1:1.4,uLifeStart+id*spacing+3.4);
  if(uLifeStudy>.5){
   size*=1.15;
   float portrait=1.-smoothstep(.65,1.,uCssWidth/uCssHeight);
   center.x=mix(center.x,0.,portrait);center.y+=portrait*2.8;
   size*=mix(1.,1.8,portrait);
  }
  emission+=lifeAt(sampleSurface,vec2(0.),response,id,center,size,species,depth);
 }
 return lifeFieldLight(emission,resting,ink,cellUV,aa,reveal,grain,0.);
}
vec3 distantMoon(vec2 surface,vec3 normal,vec3 ray){
 // One source anchored at the beginning of the document. Its reflected path
 // broadens and dims with distance, and the same ripple normal bends it.
 float distance=max(0.,surface.y);
 vec3 reflected=reflect(ray,normal);
 float alignment=pow(max(dot(reflected,normalize(vec3(-.22,1.,-.36))),0.),5.);
 float width=2.3+distance*.035;
 float across=(surface.x+1.4+normal.x*2.5)/width;
 float path=exp(-across*across)/(1.+distance*.028);
 return vec3(.11,.055,.135)*path*(.18+.26*alignment);
}
`;
