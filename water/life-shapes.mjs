// Analytic shapes only: no animal texture, raster mask, mesh or sampled drawing.
// Coordinates are local pond coordinates; time is the water's pausable clock.
export const proceduralLifeGLSL=`
float lifeSegment(vec2 p,vec2 a,vec2 b){
 vec2 edge=b-a;
 return length(p-a-edge*clamp(dot(p-a,edge)/dot(edge,edge),0.,1.));
}
float lifeCross(vec2 a,vec2 b){return a.x*b.y-a.y*b.x;}
float lifeTriangle(vec2 p,vec2 a,vec2 b,vec2 c){
 float distance=min(lifeSegment(p,a,b),min(lifeSegment(p,b,c),lifeSegment(p,c,a)));
 float orientation=sign(lifeCross(b-a,c-a));
 float inside=min(lifeCross(b-a,p-a)*orientation,min(lifeCross(c-b,p-b)*orientation,lifeCross(a-c,p-c)*orientation));
 return inside>=0.?-distance:distance;
}
float lifeFill(float distance,float blur){return 1.-smoothstep(-blur,blur,distance);}
float fishSpine(float y,float beat){
 float travel=clamp((y+.25)/.46,0.,1.);
 return -.215-.068*sin(travel*3.141593)+(.002+.020*travel*travel)*sin(beat-travel*4.7);
}
float lifeVolume(vec2 q,vec2 normalScale,vec3 light){
 // Front hemisphere of an ellipsoid: analytic surface height and normal.
 float z=sqrt(max(.001,1.-dot(q,q)));
 vec3 normal=normalize(vec3(q*normalScale,z));
 float diffuse=max(0.,dot(normal,light));
 float highlight=pow(max(0.,dot(normal,normalize(light+vec3(0.,0.,1.)))),20.);
 float rim=pow(1.-z,2.);
 return .32+.65*diffuse+.32*highlight+.14*rim;
}
float singleFish(vec2 p,float beat,float blur,vec3 light,float dark){
 float travel=clamp((p.y+.25)/.46,0.,1.);
 float width=.076*(1.-.43*travel);
 // A curved, tapering ellipsoid. Bending grows toward the tail, not the head.
 vec2 bodyPoint=vec2((p.x-fishSpine(p.y,beat))/width,(p.y+.035)/.220);
 float body=(length(bodyPoint)-1.)*width;
 vec2 root=vec2(fishSpine(.145,beat),.145);
 vec2 tangent=normalize(vec2((fishSpine(.151,beat)-fishSpine(.139,beat))/.012,1.));
 vec2 crossTail=vec2(-tangent.y,tangent.x),tip=root+tangent*.175;
 float tail=lifeTriangle(p,root,tip+crossTail*.080,tip-crossTail*.080);
 float notch=lifeTriangle(p,tip-tangent*.050,tip+tangent*.065+crossTail*.050,tip+tangent*.065-crossTail*.050);
 tail=max(tail,-notch);
 vec2 finRoot=vec2(fishSpine(-.005,beat),-.005);
 float finBeat=.012*sin(beat*1.3);
 float fin=lifeTriangle(p,finRoot+vec2(-.025,-.025),finRoot+vec2(-.098,.075+finBeat),finRoot+vec2(-.025,.055));
 fin=min(fin,lifeTriangle(p,finRoot+vec2(.025,-.015),finRoot+vec2(.075,.045-finBeat),finRoot+vec2(.025,.050)));
 float bodyLight=lifeFill(body,blur),tailLight=lifeFill(tail,blur),finLight=lifeFill(fin,blur);
 float edge=exp(-abs(body)/max(.008,blur*.7))*bodyLight;
 vec2 eye=vec2(fishSpine(-.175,beat)+.013,-.175);
 float eyeLight=exp(-dot(p-eye,p-eye)/.00012);
 float volume=lifeVolume(bodyPoint,vec2(.85,.205),light);
 // A soft gill crease gives the rounded head a readable end to its highlight.
 float gill=exp(-pow((p.y+.118-.25*(p.x-fishSpine(p.y,beat)))/.009,2.));
 volume*=1.-.14*gill;
 float finRays=.78+.22*cos((p.x-finRoot.x)*170.+p.y*32.+beat*.2);
 float finShade=.36+.26*exp(-length(p-finRoot)*11.);
 float tailRays=.84+.16*cos(atan(dot(p-root,crossTail),max(.0001,dot(p-root,tangent)))*13.);
 // The darker fish keeps a luminous contour and eye rather than disappearing.
 return max(bodyLight*(volume+(.16+.20*dark)*edge)+eyeLight*(.26+.18*dark),max(tailLight*.64*tailRays,finLight*finShade*finRays));
}
float piscesFish(vec2 p,float beat,float blur,vec3 light,float dark){
 float travel=clamp((p.y+.25)/.46,0.,1.);
 float spine=fishSpine(p.y,beat);
 float width=.079*(1.-.48*travel)*(1.+.08*exp(-pow((p.y+.12)/.07,2.)));
 vec2 bodyPoint=vec2((p.x-spine)/width,(p.y+.035)/.220);
 float body=(length(bodyPoint)-1.)*width;
 float fill=lifeFill(body,blur);
 float detail=1.-smoothstep(.007,.018,blur);
 float volume=lifeVolume(bodyPoint,vec2(.92,.23),light);
 // A rounded shoulder, raised dorsal ridge and a softer, shaded flank.
 float flank=(p.x-spine)/width;
 float ridge=exp(-pow((flank+.16)/.26,2.));
 volume+=.11*ridge*smoothstep(-.23,-.10,p.y)*(1.-smoothstep(.10,.18,p.y));
 // A rounded cheek and a subdued lateral line break the uniform flank light.
 float cheek=exp(-pow((p.y+.166)/.052,2.)-pow((flank+.24)/.55,2.));
 float lateral=exp(-pow((flank-.47)/.10,2.))*smoothstep(-.13,-.07,p.y)*(1.-smoothstep(.09,.15,p.y));
 volume+=cheek*.10;volume*=1.-lateral*.09*detail;
 float edge=exp(-abs(body)/max(.006,blur*.8))*fill;
 // Scales follow the body in staggered rows; fade finer marks at small sizes.
 float row=(p.y+.20)/.027;
 vec2 scaleCell=vec2((p.x-spine)/.023+.5*mod(floor(row),2.),row);
 vec2 tile=fract(scaleCell)-.5;
 float scales=exp(-pow((length(tile*vec2(1.,.82))-.40)/.075,2.));
 volume*=1.-.085*scales*detail*smoothstep(-.15,-.08,p.y);
 float gill=exp(-pow((p.y+.122-.34*abs(p.x-spine))/.006,2.));
 volume*=1.-.23*gill;
 float mouth=exp(-pow((p.y+.239)/.004,2.)-pow((p.x-spine)/.018,2.));
 volume*=1.-mouth*.32;
 // Paired eyes have a dark pupil and a small wet glint, not a glowing dot.
 float eyeDistance=length(vec2((abs(p.x-spine)-.027)/1.0,p.y+.179));
 float pupil=1.-smoothstep(.005,.010+blur*.35,eyeDistance);
 float eyeRim=exp(-pow((eyeDistance-.011)/.004,2.));
 volume=volume*(1.-.66*pupil)+eyeRim*.17;
 float fins=0.;
 for(int sideIndex=0;sideIndex<2;sideIndex++){
  float side=sideIndex==0?-1.:1.;
  float flap=sin(beat*.72+side*.65);
  vec2 root=vec2(fishSpine(-.075,beat)+side*.040,-.075);
  vec2 reach=vec2(side*(.094+.009*flap),.072+.012*flap);
  vec2 along=normalize(reach),across=vec2(-along.y,along.x),delta=p-root;
  float u=dot(delta,along)/length(reach);
  float fan=.031*sqrt(max(0.,4.*u*(1.-u)))*(1.-.32*u);
  float fin=max(abs(dot(delta,across))-fan,max(-u,u-1.)*length(reach));
  float rays=.76+.24*cos(atan(dot(delta,across),max(.001,dot(delta,along)))*24.);
  float membrane=sqrt(max(0.,1.-pow(dot(delta,across)/max(.004,fan),2.)));
  float fold=.5+.5*cos(u*5.-flap+dot(delta,across)*35.);
  fins=max(fins,lifeFill(fin,blur)*(.25+.14*flap+.13*membrane+.08*fold)*rays);
  // Smaller pelvic fins sit farther back and lag the shoulder stroke.
  vec2 pelvic=vec2(fishSpine(.07,beat)+side*.028,.07);
  float rear=lifeTriangle(p,pelvic,pelvic+vec2(side*.052,.074+.008*sin(beat-1.2)),pelvic+vec2(side*.017,.065));
  fins=max(fins,lifeFill(rear,blur)*.31);
 }
 vec2 root=vec2(fishSpine(.145,beat),.145);
 vec2 tangent=normalize(vec2((fishSpine(.151,beat)-fishSpine(.139,beat))/.012+.19*sin(beat-3.8),1.));
 vec2 crossTail=vec2(-tangent.y,tangent.x),tailDelta=p-root;
 float aft=dot(tailDelta,tangent),across=dot(tailDelta,crossTail);
 float fanWidth=.011+.079*smoothstep(0.,.18,aft);
 // A flexible caudal fan with two swept lobes and a concave trailing edge.
 float trailing=.191-.058*exp(-pow(across/.032,2.));
 float tail=max(abs(across)-fanWidth,max(-aft,aft-trailing));
 float tailRays=.72+.28*cos(atan(across,max(.003,aft))*22.);
 float tailLight=lifeFill(tail,blur)*(.49+.13*smoothstep(.02,.17,aft))*tailRays;
 return max(fill*(volume+(.13+.17*dark)*edge),max(fins,tailLight));
}
vec2 piscesShape(vec2 p,float seed,float blur,vec3 light){
 float beat=uTime*1.45+.12*sin(uTime*.47)+seed*12.;
 // A shared 39-second orbit, with heads pointing along the swimming path.
 // Body bends and tail beats remain independent of the orbital translation.
 float orbit=uTime*.16+seed*6.283185;
 vec2 emission=vec2(0.);
 for(int i=0;i<2;i++){
  float phase=orbit+float(i)*3.141593;
  vec2 radial=vec2(cos(phase),sin(phase));
  vec2 forward=vec2(-radial.y,radial.x);
  vec2 delta=p-radial*.355;
  vec2 fish=vec2(dot(delta,-radial),dot(delta,-forward))+vec2(-.30,-.035);
  vec3 fishLight=vec3(dot(light.xy,-radial),dot(light.xy,-forward),light.z);
  float body=piscesFish(fish,beat+float(i)*2.4,blur,fishLight,float(i));
  if(i==0)emission.x=body;else emission.y=body;
 }
 return emission;
}
vec3 koiShape(vec2 p,float seed,float blur,vec3 light){
 if(uKoiMotion.w>.5){
  vec2 forward=normalize(uKoiPose.zw),right=vec2(-forward.y,forward.x);
  vec2 fish=vec2(dot(p,right)/1.15,dot(p,-forward))/.9+vec2(0.,-.035);
  float travel=clamp((fish.y+.25)/.46,0.,1.);
  float baseline=-.215-.068*sin(travel*3.141593);
  float wave=fishSpine(fish.y,uKoiMotion.x)-baseline;
  // A quiet head, growing tail wave, and a body bend into the turn.
  fish.x+=baseline+(1.-uKoiMotion.y*2.4)*wave-uKoiMotion.z*.065*travel*travel;
  // A mature carp carries more mass at the shoulders than the small Pisces.
  float shoulder=1.+.14*exp(-pow((fish.y+.09)/.13,2.));
  float centre=fishSpine(fish.y,uKoiMotion.x);
  fish.x=centre+(fish.x-centre)/shoulder;
  vec3 fishLight=vec3(dot(light.xy,right),dot(light.xy,-forward),light.z);
  float body=piscesFish(fish,uKoiMotion.x,blur/.9,fishLight,.4);
  float across=(fish.x-fishSpine(fish.y,uKoiMotion.x))/.076;
  // Irregular, connected pigment islands follow the flank instead of bands.
  float islands=sin(fish.y*18.+.8+sin(across*1.7))+
   .43*cos(across*2.3-fish.y*11.)+.20*sin(fish.y*37.+across*3.1);
  float patch=smoothstep(.32,.73,islands);
  float barbels=0.;
  for(int i=0;i<2;i++){
   float side=i==0?-1.:1.;
   vec2 root=vec2(fishSpine(-.226,uKoiMotion.x)+side*.023,-.226);
   float whisker=lifeSegment(fish,root,root+vec2(side*.020,.017+.003*sin(uKoiMotion.x)))-.002;
   barbels=max(barbels,lifeFill(whisker,blur*.6)*.18);
  }
  body=max(body,barbels);
  float mouth=exp(-pow((fish.y+.236)/.006,2.)-pow((fish.x-fishSpine(fish.y,uKoiMotion.x))/.022,2.));
  float gillShadow=exp(-pow((fish.y+.12-.32*abs(fish.x-centre))/.007,2.));
  return mix(vec3(.90,.65,.80),vec3(.61,.29,.51),patch)*body*1.40*(1.-mouth*.16-gillShadow*.06);
 }
 float t=uTime*.70,phase=seed*6.283185;
 // Incommensurate currents make varied loops. Soft radial compression bounds
 // the path, and its analytic derivative keeps the head pointing into travel.
 vec2 raw=vec2(.22*sin(t*.88+phase)+.07*sin(t*1.63+1.2),.20*cos(t*.69+phase*1.3)+.06*sin(t*1.37+1.8));
 vec2 velocity=vec2(.22*.88*cos(t*.88+phase)+.07*1.63*cos(t*1.63+1.2),-.20*.69*sin(t*.69+phase*1.3)+.06*1.37*cos(t*1.37+1.8));
 float compression=sqrt(1.+dot(raw,raw)/.060);
 vec2 center=raw/compression;
 velocity=velocity/compression-raw*dot(raw,velocity)/(.060*compression*compression*compression);
 vec2 forward=normalize(velocity+vec2(.00001,0.)),right=vec2(-forward.y,forward.x);
 vec2 delta=p-center;
 vec2 fish=vec2(dot(delta,right),dot(delta,-forward))/1.0+vec2(-.30,-.035);
 vec3 fishLight=vec3(dot(light.xy,right),dot(light.xy,-forward),light.z);
 float beat=uTime*3.1+seed*12.;
 float body=piscesFish(fish,beat,blur,fishLight,.4);
 float across=(fish.x-fishSpine(fish.y,beat))/.076;
 float patch=smoothstep(.12,.50,sin(fish.y*21.+.9)*cos(across*2.4+fish.y*9.));
 return mix(vec3(.90,.65,.80),vec3(.61,.29,.51),patch)*body*1.40;
}
float jellyStroke(float seed){return pow(.5+.5*sin(uTime*1.34+seed*9.),3.);}
vec3 jellyShape(vec2 p,float seed,float blur,vec3 light){
 float stroke=jellyStroke(seed),width=.32*(1.-.18*stroke),height=.27*(1.+.09*stroke);
 float roll=.16*sin(uTime*.19+seed*6.);
 // A tilted ellipsoidal shell, with a shallow elliptical opening below it.
 // The same contraction carries the bell, its opening and every attachment.
 p.y-=roll*p.x;
 vec2 q=vec2(p.x/width,(p.y+.040)/height);
 float dome=(length(q)-1.)*min(width,height);
 float edgeX=clamp(p.x/width,-1.,1.);
 float lipDepth=.047*sqrt(max(0.,1.-edgeX*edgeX));
 float scallop=.004*cos(edgeX*25.);
 float rimY=-.035+scallop;
 float bell=max(dome,p.y-rimY);
 float fill=lifeFill(bell,blur);
 float z=sqrt(max(.001,1.-min(1.,dot(q,q))));
 vec3 normal=normalize(vec3(q*vec2(.82,.94),z));
 vec3 localLight=normalize(vec3(light.x,light.y-roll,light.z));
 float diffuse=max(0.,dot(normal,localLight));
 float specular=pow(max(0.,dot(normal,normalize(localLight+vec3(0.,0.,1.)))),24.);
 float fresnel=pow(1.-z,2.3);
 float outline=exp(-abs(dome)/max(.006,blur*.65));
 // Curved radial canals follow the front hemisphere, fading into thick tissue.
 float azimuth=atan(q.x,max(.045,z));
 float canals=pow(.5+.5*cos(azimuth*12.+.15*sin(q.y*5.)),18.);
 float thickness=exp(-1.35*z);
 float lower=smoothstep(-.28,-.06,p.y);
 vec3 shell=mix(vec3(.28,.12,.36),vec3(.62,.35,.66),diffuse)*(.45+.38*z);
 shell+=vec3(.77,.49,.78)*(specular*.25+fresnel*.12+outline*.14);
 shell+=vec3(.59,.27,.51)*canals*(.025+.065*lower);
 // Four soft inner lobes sit behind the gel, with parallax as the bell rolls.
 float organs=0.;
 for(int i=0;i<4;i++){
  float angle=float(i)*1.570796+.45;
  vec2 center=vec2(.10*cos(angle)+roll*.07,-.12+.048*sin(angle));
  vec2 organ=(p-center)/vec2(.045,.031);
  float ring=exp(-pow((length(organ)-.70)/.27,2.));
  organs+=ring;
 }
 shell+=vec3(.60,.18,.37)*organs*.16*(.45+.55*thickness);
 vec3 emission=shell*fill;
 // Back lip is dimmer; the front lip occludes it and catches the pond light.
 float mouth=lifeFill(abs(p.y-rimY)-lipDepth,blur)*lifeFill(abs(p.x)-width,blur);
 float back=exp(-pow((p.y-rimY+lipDepth)/max(.005,blur*.7),2.));
 float front=exp(-pow((p.y-rimY-lipDepth)/max(.006,blur*.7),2.));
 float lipMask=1.-smoothstep(width-.012,width+.012,abs(p.x));
 emission=max(emission,vec3(.34,.14,.39)*mouth*.38);
 emission+=vec3(.51,.25,.53)*back*lipMask*.20;
 emission+=vec3(.77,.46,.72)*front*lipMask*.50;
 // Filaments wrap around the elliptical lip. Far strands are finer and dimmer.
 for(int i=0;i<14;i++){
  float angle=float(i)*6.283185/14.+.18;
  float depth=sin(angle),near=.5+.5*depth;
  float rootX=width*.91*cos(angle);
  float rootY=-.035+.043*depth+.004*cos(rootX/width*25.);
  float strandLength=.65+.10*cos(float(i)*2.17+seed*5.);
  float trail=clamp((p.y-rootY)/strandLength,0.,1.);
  float wake=uTime*1.12-trail*6.4+float(i)*.73+seed*11.;
  float x=rootX*(1.-.25*trail)+trail*(.039*sin(wake)+.017*sin(wake*.63+angle));
  float radius=(.004+.003*near)*(1.-.70*trail);
  float ends=smoothstep(rootY-.01,rootY+.012,p.y)*(1.-smoothstep(.79,1.,trail));
  float coverage=lifeFill(abs(p.x-x)-radius,max(.003,blur*.66))*ends;
  float shade=(.30+.36*near)*(1.-.47*trail);
  emission=max(emission,mix(vec3(.39,.17,.45),vec3(.76,.43,.70),near)*coverage*shade*1.45);
 }
 // Four folded oral arms have lit edges, shaded centres and delayed recoil.
 for(int i=0;i<4;i++){
  float arm=float(i)-1.5;
  float travel=clamp((p.y+.020)/.57,0.,1.);
  float phase=uTime*1.03-travel*8.+arm*1.6+seed*9.;
  float x=arm*.050+travel*(.034*sin(phase)+.016*sin(phase*.7));
  float radius=(.014+.008*sin(phase+1.5))*(1.-.72*travel);
  float across=(p.x-x)/max(.003,radius);
  float ribbon=lifeFill(abs(p.x-x)-radius,max(.003,blur*.60));
  ribbon*=smoothstep(-.035,.005,p.y)*(1.-smoothstep(.74,1.,travel));
  float fold=.46+.29*cos(across*2.8+phase*.22);
  float edge=exp(-pow((abs(across)-.78)/.23,2.));
  vec3 tissue=mix(vec3(.47,.19,.43),vec3(.75,.42,.67),fold);
  emission=max(emission,tissue*ribbon*(.78-.30*travel)*(fold+.24*edge));
 }
 return emission;
}
float raySurface(vec2 p,float beat){
 float across=clamp(abs(p.x)/.46,0.,1.);
 return .090*exp(-p.x*p.x/.014-p.y*p.y/.095)+
  .085*pow(across,1.55)*sin(beat-p.y*7.2-across*2.3)+
  .012*pow(across,2.)*sin(beat*1.08-p.y*12.-across*4.);
}
float rayShape(vec2 p,float seed,float blur,vec3 light){
 float beat=uTime*1.12+seed*8.;
 float across=clamp(abs(p.x)/.46,0.,1.);
 // Rounded diamond disc; a wave travels from the shoulders to the trailing edge.
 vec2 disc=p;disc.y+=.042*pow(across,1.7)*sin(beat-p.y*7.2-across*2.3);
 float taper=clamp((disc.y+.287)/.55,0.,1.);
 float span=.46*pow(max(0.,sin(taper*3.141593)),1.25)*(.94+.06*cos(taper*3.141593));
 float distance=max(abs(disc.x)-span,abs(disc.y+.012)-.275);
 float fill=lifeFill(distance,blur);
 float z=raySurface(disc,beat),eps=.004;
 vec3 normal=normalize(vec3(-(raySurface(disc+vec2(eps,0.),beat)-z)/eps,
  -(raySurface(disc+vec2(0.,eps),beat)-z)/eps,1.));
 float diffuse=max(0.,dot(normal,light));
 float sheen=pow(max(0.,dot(normal,normalize(light+vec3(0.,0.,1.)))),22.);
 float edge=exp(-abs(distance)/max(.008,blur));
 float spine=exp(-p.x*p.x/.0026-p.y*p.y/.09);
 // Thin, flexing wings around a thick shoulder. Tiny dorsal mottling is
 // resolved only when the grid is fine enough; it never becomes glowing dots.
 float grain=.5+.5*sin(p.x*123.+sin(p.y*87.))*sin(p.y*115.+p.x*31.);
 float detail=1.-smoothstep(.007,.018,blur);
 float shoulder=exp(-pow((abs(p.x)-.085)/.038,2.)-p.y*p.y/.025);
 float emission=fill*(.18+.55*diffuse+.22*sheen+.10*edge+.16*spine);
 emission*=1.-.10*grain*detail-.12*shoulder;
 emission+=fill*.07*pow(max(0.,1.-across),3.)*diffuse;
 // The raised head, paired eyes and spiracle shadows sit above the thin disc.
 vec2 head=vec2(p.x/.090,(p.y+.145)/.132);
 float headFill=lifeFill((length(head)-1.)*.09,blur);
 emission=max(emission,headFill*(.24+.64*lifeVolume(head,vec2(.65,.40),light)));
 vec2 eye=vec2(abs(p.x)-.050,p.y+.171);
 float pupil=exp(-dot(eye,eye)/.000045);
 vec2 spiracle=vec2(abs(p.x)-.050,p.y+.135);
 emission*=1.-.52*pupil-.20*exp(-dot(spiracle,spiracle)/.00009);
 emission+=.13*exp(-dot(eye-vec2(-.006,-.006),eye-vec2(-.006,-.006))/.000022);
 float pelvic=min(lifeTriangle(p,vec2(-.07,.15),vec2(-.15,.32),vec2(-.03,.26)),
  lifeTriangle(p,vec2(.07,.15),vec2(.15,.32),vec2(.03,.26)));
 emission=max(emission,lifeFill(pelvic,blur)*.38);
 float trail=clamp((p.y-.20)/.50,0.,1.);
 float tailX=trail*trail*(.050*sin(uTime*.95-trail*4.8+seed*9.)+.015*sin(uTime*.47-trail*3.));
 float tail=lifeFill(abs(p.x-tailX)-.014*pow(1.-trail,1.3),max(.003,blur*.65));
 tail*=smoothstep(.18,.24,p.y)*(1.-smoothstep(.82,1.,trail));
 return max(emission,tail*(.69-.36*trail));
}
// Sea angel study: projected organic volumes and two thin sculling membranes.
// All silhouettes, surface derivatives and internal depth are analytic geometry.
float angelUnion(float a,float b,float softness){
 float h=clamp(.5+.5*(b-a)/softness,0.,1.);
 return mix(b,a,h)-softness*h*(1.-h);
}
vec3 seaAngelShape(vec2 p,float seed,float blur,vec3 light){
 float beat=uTime*1.12+seed*6.283185;
 float roll=.24*sin(uTime*.14+seed*4.);
 // Gentle banking changes the projected thickness and the internal parallax.
 p.x/=.94+.06*cos(roll*2.);
 float tail=clamp((p.y+.03)/.44,0.,1.);
 p.x-=.026*sin(beat*.62-tail*3.2)*tail*tail;
 float bodyWidth=mix(.105,.025,smoothstep(-.12,.42,p.y));
 vec2 trunk=vec2(p.x/bodyWidth,(p.y-.01)/.43);
 vec2 head=vec2(p.x/.105,(p.y+.315)/.108);
 float trunkDistance=(length(trunk)-1.)*bodyWidth;
 float headDistance=(length(head)-1.)*.105;
 float body=angelUnion(trunkDistance,headDistance,.025);
 float skin=lifeFill(body,blur);
 // Reconstruct a front surface. The broad shaded flank, thin Fresnel edge and
 // moving highlight describe thickness instead of painting a flat silhouette.
 vec2 surfacePoint=trunkDistance<headDistance?trunk:head;
 float z=sqrt(max(.001,1.-min(1.,dot(surfacePoint,surfacePoint))));
 vec3 normal=normalize(vec3(surfacePoint*vec2(1.15,.32),z));
 vec3 localLight=normalize(vec3(light.x+roll*.35,light.y,light.z));
 float diffuse=max(0.,dot(normal,localLight));
 float specular=pow(max(0.,dot(normal,normalize(localLight+vec3(0.,0.,1.)))),18.);
 float fresnel=pow(1.-z,2.4);
 float rim=exp(-abs(body)/max(.006,blur*.60));
 // The two inner volumes shift behind the shell as it rolls: small parallax,
 // absorption through the thick centre, and a soft shadow on the far flank.
 float innerX=p.x+roll*.045+.008*sin(p.y*10.+beat*.2);
 vec2 heart=vec2(innerX/.048,(p.y+.15)/.145);
 vec2 lower=vec2((innerX-.008)/.026,(p.y-.025)/.105);
 float innerDistance=angelUnion((length(heart)-1.)*.048,(length(lower)-1.)*.026,.014);
 float core=lifeFill(innerDistance,blur*.70)*skin;
 float innerVolume=lifeVolume(heart,vec2(.8,.28),localLight);
 float shadow=lifeFill((length(vec2((innerX-.018)/.052,(p.y+.13)/.17))-1.)*.052,blur*1.4);
 float transmission=exp(-1.05*z);
 vec3 shell=mix(vec3(.28,.095,.34),vec3(.60,.34,.68),diffuse)*(.34+.40*z);
 shell*=1.-.22*shadow;
 shell+=vec3(.76,.48,.83)*(specular*.45+fresnel*.17+rim*.12);
 vec3 emission=shell*skin;
 emission+=vec3(.81,.27,.49)*core*(.22+.52*innerVolume)*(.58+.42*transmission);
 emission+=vec3(.54,.20,.47)*exp(-abs(innerDistance)/.022)*skin*.09;
 for(int i=0;i<2;i++){
  float side=i==0?-1.:1.;
  float stroke=beat+float(i)*.18;
  float reach=.285+.070*cos(stroke)+.012*sin(stroke*2.-.5);
  float across=p.x*side;
  float t=clamp((across-.050)/reach,0.,1.);
  float envelope=max(0.,sin(t*3.141593));
  // Root-led stroke travels outwards; the tip and trailing edge follow late.
  // A second, very small wave softens the recovery without speeding it up.
  float phase=stroke-t*1.85;
  float sweep=-.105+.155*sin(phase)*t+.036*envelope
              +.018*sin(stroke*.63-t*4.2)*t*t;
  float width=.102*pow(envelope,.72)*(.88+.10*cos(phase+.5));
  float v=(p.y-sweep)/max(.008,width);
  float trailing=(.010*sin(stroke-t*5.8)+.004*sin(stroke*1.7-t*9.))*envelope*smoothstep(-.2,.9,v);
  float fin=max(abs(p.y-sweep-trailing)-width,max(.050-across,across-.050-reach));
  float membrane=lifeFill(fin,blur*.95);
  // A thin membrane height field supplies analytic normal derivatives. Its
  // fold catches the same pond light, then passes gently towards the fin tip.
  float foldPhase=v*2.4+phase;
  float dzdt=.080*(3.141593*cos(t*3.141593)*sin(phase)-1.85*envelope*cos(phase))
             +.014*(3.141593*cos(t*3.141593)*sin(foldPhase)-1.85*envelope*cos(foldPhase));
  float dzdv=.014*envelope*2.4*cos(foldPhase);
  float sweepSlope=.155*(sin(phase)-1.85*t*cos(phase))+.036*3.141593*cos(t*3.141593)
                    +.018*(2.*t*sin(stroke*.63-t*4.2)-4.2*t*t*cos(stroke*.63-t*4.2));
  float widthSlope=.102*(.72*pow(max(.025,envelope),-.28)*3.141593*cos(t*3.141593)*(.88+.10*cos(phase+.5))
                    +pow(envelope,.72)*.185*sin(phase+.5));
  float acrossSlope=(dzdt-(sweepSlope+widthSlope*v)*dzdv/max(.025,width))/reach;
  vec3 finNormal=normalize(vec3(-side*acrossSlope,-dzdv/max(.025,width),1.));
  float finLight=max(0.,dot(finNormal,localLight));
  float sheen=pow(max(0.,dot(finNormal,normalize(localLight+vec3(0.,0.,1.)))),14.);
  float thickness=sqrt(max(0.,1.-min(1.,v*v)));
  float edge=exp(-abs(fin)/max(.005,blur*.60));
  float depth=.82+side*.14*sin(stroke-t*1.2+roll);
  vec3 finColor=vec3(.53,.29,.64)*(.14+.31*thickness+.24*finLight)
               +vec3(.72,.43,.79)*(sheen*.19+edge*.09);
  // The shell covers the fin roots, establishing which surface sits in front.
  float translucent=.78+.22*sqrt(max(0.,1.-min(1.,v*v)));
  emission+=finColor*membrane*depth*translucent*(1.-skin*.78);
  float horn=lifeSegment(p,vec2(side*.048,-.38),vec2(side*(.072+.005*sin(beat)),-.455))-.010;
  emission+=vec3(.62,.34,.61)*lifeFill(horn,blur)*.42;
 }
 return emission*1.32;
}
// Betta study: side-on body, a broad caudal fan and folded dorsal/anal curtains.
vec3 bettaShape(vec2 p,float seed,float blur,vec3 light){
 float beat=uTime*1.48+seed*8.;
 float tailward=clamp((p.x+.08)/.50,0.,1.);
 p.y-=.024*sin(beat-tailward*4.6)*tailward*tailward;
 float taper=1.-.33*smoothstep(-.06,.15,p.x);
 vec2 body=vec2((p.x+.10)/.235,(p.y+.015)/(.088*taper));
 float bodyDistance=(length(body)-1.)*.088;
 float skin=lifeFill(bodyDistance,blur);
 float volume=lifeVolume(body,vec2(.28,.95),light);
 float row=(p.x+.3)/.027;
 vec2 scaleCell=vec2(row,(p.y+.06)/.022+.5*mod(floor(row),2.));
 float scales=exp(-pow((length((fract(scaleCell)-.5)*vec2(.85,1.))-.39)/.08,2.));
 float detail=1.-smoothstep(.008,.02,blur);
 vec3 emission=mix(vec3(.43,.17,.37),vec3(.83,.51,.73),volume)*skin*(1.-.10*scales*detail);
 // Thin caudal membrane with a scalloped hem and branching rays.
 vec2 fin=p-vec2(.105,0.);
 // The narrow peduncle drives a heavy fan. The outer silk follows later,
 // with a travelling fold rather than an entire rigid tail waving at once.
 fin.y-=.030*sin(beat-1.8)*smoothstep(0.,.32,fin.x);
 float radius=length(fin),angle=atan(fin.y,fin.x);
 float fanRadius=.325+.014*sin(angle*15.+beat-radius*5.)+.009*sin(angle*28.-beat*.7-radius*9.);
 fanRadius*=.94+.06*cos(beat-1.2);
 float fan=max(radius-fanRadius,max(abs(angle)-1.30,.018-radius)*.16);
 float finFill=lifeFill(fan,blur)*smoothstep(.005,.05,fin.x);
 float fold=.5+.5*cos(angle*24.+radius*14.-beat*.7-radius*5.);
 float rayPhase=angle*37.+radius*8.+.35*sin(beat-radius*6.);
 float rays=pow(.5+.5*cos(rayPhase),10.);
 vec3 membrane=mix(vec3(.37,.12,.40),vec3(.77,.36,.64),.30+.40*fold);
 float hem=exp(-pow((radius-fanRadius+.009)/.012,2.));
 float finDepth=.68+.24*cos(angle)*cos(beat-radius*5.);
 float transmission=.66+.34*(1.-smoothstep(.05,.30,radius));
 vec3 fanLight=membrane*finFill*(.36+.28*fold+.13*rays+.16*hem)*finDepth*transmission;
 emission=emission*(1.-finFill*(1.-skin)*.35)+fanLight*(1.-skin*.90);
 for(int i=0;i<2;i++){
  float side=i==0?-1.:1.,lengthwise=clamp((p.x+.19)/.43,0.,1.);
  float wave=sin(lengthwise*3.141593);
  float root=.058*sqrt(max(0.,1.-pow((p.x+.10)/.235,2.)));
  float reach=(i==0?.12:.18)*pow(max(0.,wave),.7);
  float flutter=.012*sin(beat-lengthwise*5.+side)*wave;
  float y=side*p.y;
  float curtain=max(max(root-y,y-root-reach-flutter),max(-.19-p.x,p.x-.24));
  float fill=lifeFill(curtain,blur);
  float pleat=.50+.50*cos(lengthwise*32.-y*13.+beat*.6);
  emission=max(emission,mix(vec3(.38,.13,.37),vec3(.74,.38,.63),pleat)*fill*(.40+.30*pleat));
 }
 // A small pectoral paddle works continuously beside the gill, independently
 // of the much slower caudal stroke used for propulsion.
 vec2 paddle=p-vec2(-.20,.025);
 float paddleBeat=sin(beat*2.3);
 vec2 paddlePoint=vec2((paddle.x-.022)/.050,(paddle.y-.028-.010*paddleBeat)/.032);
 float paddleFill=lifeFill((length(paddlePoint)-1.)*.032,blur);
 emission=mix(emission,vec3(.68,.35,.59),paddleFill*(.14+.10*paddleBeat));
 // Pelvic filaments trail from the throat and lag the fan stroke.
 for(int i=0;i<2;i++){
  float t=clamp((p.y-.04)/.22,0.,1.);
  float x=-.19+float(i)*.035+t*(.065+.012*sin(beat-t*4.+float(i)));
  float thread=lifeFill(abs(p.x-x)-.006*(1.-.7*t),blur*.65);
  thread*=smoothstep(.045,.075,p.y)*(1.-smoothstep(.82,1.,t));
  emission=max(emission,vec3(.72,.36,.60)*thread*.55);
 }
 float gill=exp(-pow((p.x+.235+.4*p.y)/.006,2.));
 emission*=1.-.22*gill*skin;
 vec2 eye=p-vec2(-.282,-.023);
 float pupil=exp(-dot(eye,eye)/.00005);
 emission*=1.-.78*pupil;
 emission+=vec3(.85,.66,.79)*exp(-dot(eye+vec2(.004,.003),eye+vec2(.004,.003))/.000012)*.22;
 return emission*1.12;
}
// Rooted life stays in the same submerged field: no sprite or floating icon.
vec3 anemoneShape(vec2 p,float seed,float blur,vec3 light){
 float current=uTime*.48+seed*8.;
 vec2 foot=vec2(p.x/.105,(p.y-.115)/.115);
 float footFill=lifeFill((length(foot)-1.)*.105,blur);
 vec3 emission=vec3(.32,.13,.32)*footFill*lifeVolume(foot,vec2(.7,.6),light)*.35;
 // An oblique oral disc, with a dark mouth; the far crown is dimmer than
 // the near crown. Each soft tube bends progressively away from its root.
 for(int i=0;i<24;i++){
  float a=float(i)*6.283185/24.+seed*2.;
  vec2 direction=vec2(cos(a),sin(a)*.65);
  vec2 across=normalize(vec2(-direction.y,direction.x));
  float reach=.23+.055*sin(float(i)*2.37+seed*5.);
  vec2 root=vec2(.095*cos(a),.062*sin(a));
  vec2 delta=p-root;
  float t=clamp(dot(delta,direction)/dot(direction,direction)/reach,0.,1.);
  float bend=(.028*sin(current-t*2.7+a)+.012*sin(current*.71-t*4.6))*t*t;
  vec2 center=root+direction*reach*t+across*bend;
  float radius=(.011+.003*cos(a*3.))*(1.-.63*t);
  float distance=length(p-center)-radius;
  float coverage=lifeFill(distance,max(blur*.65,.002));
  float cylinder=sqrt(max(0.,1.-pow(dot(p-center,across)/max(.003,radius),2.)));
  float near=.5+.5*sin(a),shade=.30+.20*cylinder+.13*near;
  vec3 tissue=mix(vec3(.35,.13,.38),vec3(.58,.27,.48),near);
  emission=max(emission,tissue*coverage*shade*(1.-.22*t));
 }
 vec2 disc=vec2(p.x/.105,p.y/.069);
 float fill=lifeFill((length(disc)-1.)*.069,blur);
 float mouth=exp(-pow(p.x/.021,2.)-pow(p.y/.012,2.));
 emission=mix(emission,vec3(.39,.17,.39)*(.37+.20*lifeVolume(disc,vec2(.7,.5),light))*(1.-mouth*.72),fill);
 return emission*2.0;
}
vec3 seaweedShape(vec2 p,float seed,float blur,vec3 light){
 vec3 emission=vec3(0.);
 float current=uTime*.34+seed*8.;
 for(int i=0;i<5;i++){
  float frond=float(i)-2.;
  float height=.69+.16*cos(frond*1.7+seed*4.);
  float t=clamp((.55-p.y)/height,0.,1.);
  float bend=.095*sin(current-t*2.6)+.023*sin(current*.73-t*5.+frond);
  float x=frond*.040+t*(frond*.025)+bend*t*t;
  float width=(.030+.008*cos(frond*2.))*pow(max(0.,sin(t*3.141593)),.62);
  float side=(p.x-x)/max(.004,width);
  float ribbon=lifeFill(abs(p.x-x)-width,max(.002,blur*.7));
  ribbon*=smoothstep(-.01,.04,t)*(1.-smoothstep(.94,1.,t));
  float twist=.5+.5*cos(t*5.5-current+frond*.7);
  float volume=sqrt(max(0.,1.-min(1.,side*side)));
  float vein=exp(-side*side/.045);
  vec3 tissue=mix(vec3(.33,.14,.37),vec3(.50,.26,.49),twist);
  emission=max(emission,tissue*ribbon*(.28+.20*volume+.06*vein)*(.72+.20*t));
 }
 return emission*2.8;
}
// The faint ASCII lattice is analytic too: line segments, circles and a sine.
// Glyphs . : + * o x # ~ occupy fixed cells; no glyph atlas is uploaded.
float fieldInk(vec2 uv,float glyph,float aa){
 vec2 p=(uv-.5)*vec2(1.,1.5);float distance=1.;
 if(glyph<.5)distance=length(p-vec2(0.,.28))-.045;
 else if(glyph<1.5)distance=min(length(p-vec2(0.,.19)),length(p+vec2(0.,.19)))-.042;
 else if(glyph<2.5)distance=min(lifeSegment(p,vec2(-.24,0.),vec2(.24,0.)),lifeSegment(p,vec2(0.,-.30),vec2(0.,.30)))-.036;
 else if(glyph<3.5){
  distance=min(lifeSegment(p,vec2(-.24,0.),vec2(.24,0.)),min(lifeSegment(p,vec2(-.16,-.28),vec2(.16,.28)),lifeSegment(p,vec2(.16,-.28),vec2(-.16,.28))))-.034;
 }else if(glyph<4.5)distance=abs(length(p/vec2(.22,.31))-1.)*.22-.034;
 else if(glyph<5.5)distance=min(lifeSegment(p,vec2(-.21,-.28),vec2(.21,.28)),lifeSegment(p,vec2(.21,-.28),vec2(-.21,.28)))-.035;
 else if(glyph<6.5){
  distance=min(min(lifeSegment(p,vec2(-.12,-.32),vec2(-.16,.32)),lifeSegment(p,vec2(.16,-.32),vec2(.12,.32))),min(lifeSegment(p,vec2(-.25,-.12),vec2(.25,-.12)),lifeSegment(p,vec2(-.25,.12),vec2(.25,.12))))-.033;
 }else distance=max(abs(p.y-.09*sin(p.x*12.))-.025,abs(p.x)-.27);
 return min(1.,lifeFill(distance,aa)*1.22);
}
`;
