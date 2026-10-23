// Explicit, reversible material study. Existing pages and shared studies keep
// the oblique chalice material unless their host or URL opts in.
export function resolveWaterView(hostView,queryView){
 return (queryView||hostView)==='pond'?'pond':'oblique';
}

export const pondMaterialGLSL=`
// Orthographic view from above. Water, organisms, wake and pointer contacts all
// use the same document-space plane; there is no perspective ellipse/horizon.
vec3 overheadPond(vec2 surface,vec2 slope,vec2 response){
 vec3 normal=normalize(vec3(-slope.x*1.8,1.,-slope.y*1.8));
 vec3 reflected=reflect(vec3(0.,-1.,0.),normal);
 // A single broad source remains near the surface of the document. The
 // direction varies with position, so ripples catch it rather than inventing
 // luminous wave bands. Roughness gives a soft reflection, never a hard disc.
 vec3 toMoon=normalize(vec3(-1.8-surface.x,9.5,.5-surface.y));
 float alignment=max(dot(reflected,toMoon),0.);
 float moon=pow(alignment,48.);
 // Soft reflected surroundings give even the lower, moon-distant water a
 // readable surface. This is an angular environment reflection, not another
 // moving light or a screen-space gradient; only the water normal changes it.
 float reflectedSky=exp(-sq((reflected.x+.16)*4.)-sq((reflected.z+.32)*4.));
 vec3 ambient=vec3(.065,.032,.085)+vec3(.090,.052,.105)*reflectedSky;
 vec3 light=vec3(.105,.080,.130)*(moon*.82+pow(alignment,9.)*.14);
 // A little depth variation in the same aubergine water, without a new lamp,
 // painted caustic pattern, concentric target or vignette around each animal.
 float bed=.5+.5*sin(surface.x*.61+sin(surface.y*.37))*sin(surface.y*.49-surface.x*.26);
 vec3 body=vec3(.052,.029,.078)+vec3(.014,.005,.019)*bed;
 vec3 life=submergedLife(surface,slope,response);
 vec3 color=body*.56+ambient*.48+light;
 // The same reflective surface lies over the creatures. Greater local tilt
 // catches the moonlight and modestly veils the view below it.
 color+=life*(.56-moon*.12);
 color+=bioluminescence(surface,slope,response)*.46;
 return color;
}
`;
