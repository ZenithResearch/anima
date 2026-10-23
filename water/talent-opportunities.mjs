// Stable keys and bit positions. The first four retain the original ABI.
const option=(key,label,description,bit)=>Object.freeze({key,label,description,bit});
export const OPPORTUNITY_GROUPS=Object.freeze([
 {label:'Screen & digital',options:[
  option('digital','Digital / social','Social campaigns, creator content & UGC.',1),
  option('commercial','Commercial acting','Television, cinema & online advertising.',4),
  option('featureFilm','Feature films','Feature-length fiction & independent cinema.',5),
  option('shortFilm','Short films','Short-form fiction, independent & student films.',6),
  option('television','Television / streaming','Scripted series, episodic drama & comedy.',7),
  option('musicVideo','Music videos','On-camera roles, performance & movement.',8),
  option('corporateFilm','Corporate / educational film','Business, training, explainers & non-broadcast work.',9)
 ]},
 {label:'Modelling & print',options:[
  option('commercialPrint','Commercial / lifestyle print','Advertising, brand imagery & out-of-home campaigns.',10),
  option('editorial','Fashion / editorial','Magazine stories, fashion editorials & lookbooks.',11),
  option('ecommerce','E-commerce / catalogue','Product, clothing & online retail imagery.',12),
  option('runway','Runway / fashion presentations','Catwalk shows & live fashion presentations.',13),
  option('beauty','Beauty / hair','Cosmetics, skincare, hair campaigns & demonstrations.',14),
  option('parts','Hand / parts modelling','Close-up hand, feet & other specialist parts work.',15)
 ]},
 {label:'Voice & audio',options:[
  option('voiceover','Commercial voiceover','Audio ads, promos, trailers & brand voice.',16),
  option('characterVoice','Character voice / animation / games','Animated characters, interactive & game performances.',17),
  option('narration','Narration / audiobooks','Documentary, factual, long-form & audiobook narration.',18),
  option('dubbing','Dubbing / ADR','Dubbing, dialogue replacement & voice to picture.',19),
  option('singing','Singing / session vocals','Live vocals, recording sessions, backing & lead vocals.',20)
 ]},
 {label:'Live & appearances',options:[
  option('live','Live events / appearances','Events, launches, activations & live performance.',0),
  option('theatre','Theatre / musical theatre','Stage acting, plays & musical theatre.',21),
  option('dance','Dance / movement','Live and filmed dance & movement performance.',22),
  option('presenting','Presenting / hosting','On-camera presenting, event hosting & emcee work.',23),
  option('promotion','Promotional work','Brand ambassador work, product launches & sampling.',3),
  option('atmosphere','Atmosphere modelling','Booked appearances that help create the atmosphere at live events.',2)
 ]}
]);
export const OPPORTUNITY_OPTIONS=Object.freeze(OPPORTUNITY_GROUPS.flatMap(group=>group.options));
export const OPPORTUNITY_MASK=0xffffff;
export const OPPORTUNITY_ERROR='Choose at least one type of work.';
export function selectedOpportunities(raw={}){
 return OPPORTUNITY_OPTIONS.filter(option=>raw[option.key]==='yes');
}
