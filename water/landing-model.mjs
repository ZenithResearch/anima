import {selectedOpportunities} from './talent-opportunities.mjs';
import {talentPortfolioText} from './talent-portfolio.mjs';
export const DRAFT_KEY='anima.landing.project.v1';
export const LIMITS={brand:100,outcome:2000,audience:1500,context:2000};
export const SCOPE={brand:'A brand',campaign:'A campaign',both:'Brand and campaign'};
export function normalizeDraft(raw={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
 const draft=Object.fromEntries(Object.entries(LIMITS).map(([key,max])=>[key,typeof raw[key]==='string'?raw[key].slice(0,max).trim():'']));
 return {...draft,scope:Object.hasOwn(SCOPE,raw.scope)?raw.scope:'',creatorInterest:raw.creatorInterest===true,naming:raw.naming===true};
}
export function validateDraft(raw){
 const d=normalizeDraft(raw),errors=[];
 for(const [key,message] of [['brand','Add your brand or project name.'],['scope','Choose a brand, a campaign or both.'],['outcome','Tell us what you want to make happen.'],['audience','Tell us who you want to reach.']])if(!d[key])errors.push({key,message});
 return errors;
}
export function enterDraft(raw,entry,touched){
 const d=normalizeDraft(raw);
 if(!touched)d.scope=entry==='creators'?'campaign':'brand';
 if(entry==='creators')d.creatorInterest=true;
 return d;
}
export function loadDraft(storage){
 try{const value=JSON.parse(storage.getItem(DRAFT_KEY)||'null');if(!value||value.schemaVersion!==1)return null;return {draft:normalizeDraft(value),savedAt:typeof value.savedAt==='string'?value.savedAt:null};}catch{return null;}
}
export function saveDraft(storage,raw,now=new Date().toISOString()){
 const record={schemaVersion:1,concept:'anima',...normalizeDraft(raw),savedAt:now};
 try{storage.setItem(DRAFT_KEY,JSON.stringify(record));return {stored:true,record};}catch{return {stored:false,record:{...record,savedAt:null}};}
}
export function clearDraft(storage){try{storage.removeItem(DRAFT_KEY);return true;}catch{return false;}}
export const LEGACY_KEYS=[['anima.water.brief.assemblies','Anima workshop outline'],['mimi-system-outline-v02','Mimi system outline'],['mimi.atomic.brief.template-review','Mimi template outline'],['anima.water.brief.anima-landing','Earlier Anima outline'],['zenith-brand-outline-v1:juiced','Juiced outline'],['zenith-brand-outline-v1:mimi','Mimi outline'],['zenith-brand-outline-v1:anima','Anima identity outline']];
export function earlierDrafts(storage){
 const found=[];
 for(const [key,label] of LEGACY_KEYS)try{
  const v=JSON.parse(storage.getItem(key)||'null');
  if(!v||typeof v!=='object'||Array.isArray(v)||typeof v.brand!=='string')continue;
  found.push({key,label,draft:normalizeDraft({...v,outcome:v.outcome??v.goal??v.thought??'',naming:v.naming??v.openToNaming??false})});
 }catch{}
 return found;
}
export function exportDraft(raw,savedRecord,now=new Date().toISOString()){
 const draft=normalizeDraft(raw),same=savedRecord&&JSON.stringify(normalizeDraft(savedRecord))===JSON.stringify(draft);
 return {schemaVersion:1,concept:'anima',...draft,savedAt:same?savedRecord.savedAt:null,exportedAt:now,destination:'Local outline only. No enquiry sent.'};
}
let interactionNext=null;
export function configureInteractionCore(next){
 if(typeof next!=='function')throw new TypeError('Expected an interaction core function.');
 interactionNext=next;
}
export function nextTab(key,index,count){
 if(interactionNext)return interactionNext(key,index,count);
 if(['ArrowRight','ArrowDown'].includes(key))return (index+1)%count;
 if(['ArrowLeft','ArrowUp'].includes(key))return (index-1+count)%count;
 if(key==='Home')return 0;if(key==='End')return count-1;return null;
}

const preparedEmail=(subject,body)=>`mailto:anima@zenith-research.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
export function projectEmail(raw){
 const d=normalizeDraft(raw);
 const body=[`Brand or project: ${d.brand}`,`Scope: ${SCOPE[d.scope]||'To discuss'}`,`Desired outcome:\n${d.outcome}`,`Audience:\n${d.audience}`,`Existing context or links:\n${d.context||'To discuss'}`,`Creator collaboration: ${d.creatorInterest?'Yes':'Not requested'}`,`Naming: ${d.naming?'Include naming':'Not requested'}`].join('\n\n');
 return preparedEmail('Start an Anima project',body);
}
export function introductionEmail(role,raw={}){
 const text=(key,max)=>typeof raw[key]==='string'?raw[key].trim().slice(0,max):'';
 if(role==='talent'){
  const selected=key=>raw[key]==='yes',represented=raw.representation==='represented';
  const workLinks=raw.talentPortfolio?talentPortfolioText(raw.talentPortfolio,selectedOpportunities(raw).map(option=>option.key)):`Portfolio / showreel / social profile: ${text('portfolio',1500)}`;
  const body=[`Name: ${text('name',100)}`,`Email: ${text('email',200)}`,`Based in: ${text('location',150)}`,workLinks,
   `Opportunities: ${selectedOpportunities(raw).map(option=>`${option.label} — ${option.description}`).join('; ')||'To discuss'}`,
   `Atmosphere modelling: ${selected('atmosphere')?'Interested':'Not opted in'}`,`Promotional work: ${selected('promotion')?'Interested':'Not opted in'}`,`Representation: ${represented?'Agent / manager':'Self-represented'}`];
  if(represented)body.push(`Agent / manager: ${text('agentName',100)}`,`Agency / management: ${text('agency',150)||'Not provided'}`,`Agent / manager email: ${text('agentEmail',200)}`,`Booking phone: ${text('agentPhone',60)||'Not provided'}`,'Coordinate booking enquiries through my representative.');
  body.push(`Roster visibility: ${raw.visibility==='approval'?'Open to a public profile only with my approval':'Private roster only — do not publish my profile'}`,`Disciplines, experience & availability:\n${text('context',2000)||'To discuss'}`,'I understand that this request does not guarantee roster acceptance or bookings.');
  if(text('characterDraft',20000))body.push(`Character draft (self-supplied, not independently verified):\n${text('characterDraft',20000)}`);
  return preparedEmail('Anima talent roster request',body.join('\n\n'));
 }
 const creator=role==='creator';
 const body=[`Name: ${text('name',100)}`,`Email: ${text('email',200)}`,creator?`Work / portfolio: ${text('portfolio',1500)}`:`Organization: ${text('organization',100)}`,`Context:\n${text('context',2000)}`];
 if(text('characterDraft',20000))body.push(`Character draft (self-supplied, not independently verified):\n${text('characterDraft',20000)}`);
 if(creator)body.push('I understand that an introduction does not guarantee membership or paid work.');
 return preparedEmail(creator?'Anima creator / studio introduction':'Start an Anima Network project',body.join('\n\n'));
}
