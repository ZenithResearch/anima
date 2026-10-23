// Submerged text emission only; independent of pointer and koi wake colours.
export const DEFAULT_RAIN_COLOR='tidal';
export const RAIN_COLORS=Object.freeze({
 tidal:{label:'Tidal mix',swatch:'#9b6b9b',tones:[[.30,.105,.36],[.35,.085,.19],[.39,.28,.45]]},
 aubergine:{label:'Aubergine',swatch:'#92649e',tones:[[.26,.08,.34],[.34,.14,.42],[.43,.28,.49]]},
 burgundy:{label:'Burgundy',swatch:'#a05c75',tones:[[.28,.055,.12],[.39,.10,.22],[.43,.24,.34]]},
 pearl:{label:'Pearl lilac',swatch:'#b1a0c0',tones:[[.22,.16,.31],[.32,.23,.39],[.43,.36,.48]]}
});
export function rainColor(id){return Object.hasOwn(RAIN_COLORS,id)?id:DEFAULT_RAIN_COLOR;}
