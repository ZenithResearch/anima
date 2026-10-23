// Emission only: the pond material, reflected light and animals keep their palette.
export const DEFAULT_TRAIL_COLOR='aubergine';
export const TRAIL_COLORS=Object.freeze({
 original:{label:'Original',swatch:'#63bfc2',crest:[.04,.39,.40],depth:[.018,.09,.14]},
 violet:{label:'Violet',swatch:'#a192e0',crest:[.26,.16,.53],depth:[.052,.034,.17]},
 orchid:{label:'Orchid',swatch:'#cf87b6',crest:[.44,.12,.34],depth:[.12,.024,.10]},
 garnet:{label:'Garnet',swatch:'#cb6c85',crest:[.49,.075,.16],depth:[.14,.018,.045]},
 aubergine:{label:'Aubergine',swatch:'#785080',mark:'#f1eaf1',crest:[.27,.065,.34],depth:[.065,.016,.083]},
 burgundy:{label:'Burgundy',swatch:'#853148',mark:'#f1eaf1',crest:[.42,.035,.10],depth:[.10,.008,.026]}
});
export function trailColor(id){return Object.hasOwn(TRAIL_COLORS,id)?id:DEFAULT_TRAIL_COLOR;}
