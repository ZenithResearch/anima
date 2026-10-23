import {OPPORTUNITY_OPTIONS} from './talent-opportunities.mjs';
export const PORTFOLIO_SCHEMA='anima.talent-portfolio.v1';
export const PORTFOLIO_LIMIT=12;
export const MEDIA_FORMATS=Object.freeze([
 {id:'portfolio',label:'Portfolio'}, {id:'showreel',label:'Showreel'},
 {id:'voice-demo',label:'Voice demo'}, {id:'social',label:'Social profile'},
 {id:'other',label:'Other work'}
]);
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const strings=value=>Array.isArray(value)?[...new Set(value.filter(v=>typeof v==='string'))]:[];
export function portfolioURL(value){
 if(typeof value!=='string'||!value.trim()||value.length>1500)return null;
 try{const url=new URL(value.trim());return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
// Parse an additive roster payload. A malformed new payload is an error, never
// silently replaced with its legacy first-link projection.
export function readTalentPortfolio(input,availableWorkTypes){
 const errors=[];
 const fail=(path,message)=>errors.push({path,message});
 let raw=input;
 if(typeof raw==='string'){
  if(raw.length>60000)return {value:null,errors:[{path:'media',message:'This collection is too large. Use up to twelve links.'}]};
  try{raw=JSON.parse(raw);}catch{return {value:null,errors:[{path:'media',message:'The work-link collection could not be read.'}]};}
 }
 if(!raw||raw.schema!==PORTFOLIO_SCHEMA||!Array.isArray(raw.media)||!Array.isArray(raw.characters))return {value:null,errors:[{path:'media',message:'The work-link collection could not be read.'}]};
 if(raw.media.length<1||raw.media.length>PORTFOLIO_LIMIT)fail('media','Add between one and twelve work links.');
 if(raw.characters.length>16)fail('characters','Use up to sixteen linked characters.');
 const characterIds=new Set(),mediaIds=new Set();
 const characters=raw.characters.slice(0,16).map((character,index)=>{
  const id=text(character?.id,80),name=text(character?.name,80),description=text(character?.description,400);
  if(!id||characterIds.has(id)||!name)fail(`characters.${index}`,'Give each linked character a name.');
  characterIds.add(id);return {id,name,description};
 });
 const known=new Set(OPPORTUNITY_OPTIONS.map(option=>option.key));
 const available=availableWorkTypes?new Set(availableWorkTypes):null;
 const media=raw.media.slice(0,PORTFOLIO_LIMIT).map((item,index)=>{
  const id=text(item?.id,80),format=MEDIA_FORMATS.find(type=>type.id===item?.format)?.id;
  if(!id||mediaIds.has(id))fail(`media.${index}`,'Each work link needs a unique reference.');
  mediaIds.add(id);
  if(!format)fail(`media.${index}.format`,'Choose a format for this link.');
  const url=portfolioURL(item?.url);
  if(!url)fail(`media.${index}.url`,'Use a full https:// link without a username or password.');
  const workTypes=strings(item?.workTypes),linkedCharacters=strings(item?.characterIds);
  if(!workTypes.length)fail(`media.${index}.workTypes`,'Choose at least one type of work this link supports.');
  if(workTypes.some(key=>!known.has(key)||available&&!available.has(key)))fail(`media.${index}.workTypes`,'A linked work type is no longer selected above. Unlink it here or select it again.');
  if(linkedCharacters.some(id=>!characterIds.has(id)))fail(`media.${index}.characterIds`,'A linked character was removed. Unlink it here or choose another character.');
  return {id,format:format||'other',title:text(item?.title,80),url:url||'',workTypes,characterIds:linkedCharacters};
 });
 // Only explicitly attached characters travel with the roster request.
 const referenced=new Set(media.flatMap(item=>item.characterIds));
 return {value:{schema:PORTFOLIO_SCHEMA,characters:characters.filter(character=>referenced.has(character.id)),media},errors};
}
export function talentPortfolioText(input,availableWorkTypes){
 const {value,errors}=readTalentPortfolio(input,availableWorkTypes);
 if(errors.length)throw new Error(errors[0].message);
 const labels=new Map(OPPORTUNITY_OPTIONS.map(option=>[option.key,option.label]));
 return ['Work links and their associations:',...value.media.map((item,index)=>{
  const format=MEDIA_FORMATS.find(type=>type.id===item.format).label;
  const characters=item.characterIds.map(id=>value.characters.find(character=>character.id===id).name);
  return `${index+1}. ${item.title||format} [${format}]\n${item.url}\nWork: ${item.workTypes.map(key=>labels.get(key)).join('; ')}\nCharacters: ${characters.join('; ')||'General sample — no specific character'}`;
 }),...(value.characters.length?['Linked characters (self-described):',...value.characters.map(character=>`${character.name}${character.description?` — ${character.description}`:''}`)]:[])].join('\n\n');
}
