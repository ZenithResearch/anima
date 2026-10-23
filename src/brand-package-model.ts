import {readReferences,type BrandReference} from './brand-references-model.js';
// UI-owned brief fields. Older answers remain readable without being reinterpreted.
export const MAX_PEOPLE=7;
export const brandQuestions=[
 {id:'brand',label:'Brand',title:'What do you do?',prompt:'Describe what you offer and what it makes possible.',hint:'What matters about how you do it?',placeholder:'We…'},
 {id:'people',label:'People',title:'Who is it for?',prompt:'Whose world do you want to enter, and what could your brand make possible for them?',hint:'Describe people and a moment in their lives. Add a separate description for each type of person, up to seven.',placeholder:'The people I have in mind…'},
 {id:'feeling',label:'Feeling',title:'How should people feel?',prompt:'Describe the bodily sensation and the emotional response separately.',hint:'Everyday words are enough. Leave the bodily answer open if nothing comes to mind.',placeholder:''},
 {id:'world',label:'World',title:'What do you want them to perceive?',prompt:'Describe what someone encounters when they enter your world, and what they come to understand.',hint:'It can be real or imagined.',placeholder:'When you enter…'},
 {id:'references',label:'References',title:'What can you show us?',prompt:'Add files, links or Pinterest boards that help us understand what you mean.',hint:'Optional. Tell us what matters to you about them.',placeholder:''}
] as const;
export type BrandQuestionId=typeof brandQuestions[number]['id'];
export const answerFields=[
 {id:'brand',label:'Brand',prompt:'What do you do?',placeholder:'We…',required:true},
 {id:'body',label:'In the body (optional)',prompt:'When someone encounters your brand, what do you want them to feel in their body?',placeholder:'A physical sensation, in your own words…',required:false},
 {id:'emotion',label:'Emotion',prompt:'What do you want them to feel emotionally?',placeholder:'I want people to feel…',required:true},
 {id:'world',label:'World',prompt:'What do you want them to perceive?',placeholder:'When you enter…',required:true},
 {id:'signature',label:'Moments & rituals (optional)',prompt:'Are there moments, stories or things people regularly do that belong in this world?',placeholder:'Something that already happens, or that we would like to introduce…',required:false}
] as const;
export type BrandAnswerId=typeof answerFields[number]['id']|'feeling'|'people'|'references';
export type BrandPromptSet='feeling-v2'|'experience-v3';
export interface BrandPackageDraft {version:1;answers:Partial<Record<BrandAnswerId,string>>;peopleEntries?:string[];references?:BrandReference[];promptSet?:BrandPromptSet}
export const BRAND_PREVIEW_KEY='anima.brand-package.preview.v1';
export const emptyBrandPackage=():BrandPackageDraft=>({version:1,answers:{},promptSet:'experience-v3'});
const answerIds:BrandAnswerId[]=['feeling','people','world','signature','references','brand','body','emotion'];
export function peopleDescriptions(draft:Pick<BrandPackageDraft,'answers'|'peopleEntries'>):string[]{
 return draft.peopleEntries?.length?[...draft.peopleEntries]:draft.answers.people?[draft.answers.people]:[''];
}
export function peopleText(entries:string[]):string{return entries.length===1?entries[0]||'':entries.map((s,i)=>`${i+1}. ${s}`).join('\n\n');}
export function setPeople(draft:BrandPackageDraft,entries:string[]):void {
 if(!entries.length||entries.length>MAX_PEOPLE||entries.some(s=>typeof s!=='string'||s.length>4000))throw Error('Use up to seven descriptions, each under 4,000 characters.');
 draft.peopleEntries=[...entries];draft.answers.people=peopleText(entries);
}
export function readBrandPackage(raw:unknown):BrandPackageDraft|null {
 if(!raw||typeof raw!=='object'||(raw as {version?:unknown}).version!==1)return null;
 const value=raw as Partial<BrandPackageDraft>,source=value.answers;
 if(!source||typeof source!=='object'||Array.isArray(source))return null;
 if(value.promptSet!==undefined&&!['feeling-v2','experience-v3'].includes(value.promptSet))return null;
 if(value.peopleEntries!==undefined&&(!Array.isArray(value.peopleEntries)||!value.peopleEntries.length||value.peopleEntries.length>MAX_PEOPLE||value.peopleEntries.some(s=>typeof s!=='string'||s.length>4000)))return null;
 const answers:BrandPackageDraft['answers']={};
 for(const id of answerIds){const text=source[id];if(typeof text==='string')answers[id]=text.slice(0,id==='people'&&value.peopleEntries?28200:4000);}
 const draft:BrandPackageDraft={version:1,answers,...(Array.isArray(value.references)?{references:readReferences(value.references)}:{}),...(value.promptSet?{promptSet:value.promptSet}:{})};
 if(value.peopleEntries)setPeople(draft,value.peopleEntries);
 return draft;
}
export function missingBrandQuestions(draft:BrandPackageDraft):BrandQuestionId[]{
 if(draft.promptSet!=='experience-v3')return (['feeling','people','world','signature','references'] as const).filter(id=>!(id==='references'?(draft.references?.length||draft.answers.references?.trim()):draft.answers[id]?.trim())) as BrandQuestionId[];
 return (['brand','people','feeling','world'] as const).filter(id=>id==='people'?peopleDescriptions(draft).some(s=>!s.trim()):!(id==='feeling'?draft.answers.emotion:draft.answers[id])?.trim());
}
export function requiredProgress(draft:BrandPackageDraft):string{const total=draft.promptSet==='experience-v3'?4:5;return `${total-missingBrandQuestions(draft).length} of ${total} required cards complete`;}
export function cardText(draft:BrandPackageDraft,id:BrandQuestionId):string {
 if(id==='people'){const entries=peopleDescriptions(draft).filter(s=>s.trim());return entries.length>1?`${entries.length} people descriptions`:entries[0]||'';}
 if(id==='feeling')return [draft.answers.emotion,draft.answers.body].filter(Boolean).join('\n\n')||draft.answers.feeling||'';
 if(id==='world')return [draft.answers.world,draft.answers.signature].filter(Boolean).join('\n\n');
 if(id==='references')return draft.references?.length?`${draft.references.length} imported references`:draft.answers.references||'';
 return draft.answers[id]||'';
}
export function answeredCount(draft:BrandPackageDraft):number {return brandQuestions.filter(q=>cardText(draft,q.id).trim()).length;}
export function brandAnswerSections(draft:BrandPackageDraft):{label:string;text:string}[]{
 const sections=[{label:'Brand',text:draft.answers.brand||''},...peopleDescriptions(draft).map((text,i)=>({label:`People · ${i+1}`,text})),{label:'In the body (optional)',text:draft.answers.body||''},{label:'Emotion',text:draft.answers.emotion||''},{label:'World',text:draft.answers.world||''},{label:'Moments & rituals (existing or desired; optional)',text:draft.answers.signature||''}];
 if(draft.answers.feeling)sections.push({label:'Earlier feeling response (retained)',text:draft.answers.feeling});
 return sections;
}
export function brandPackageText(draft:BrandPackageDraft):string {
 return ['ANIMA / BRAND PACKAGE INPUTS','Your own words. Not a generated or submitted brand package.','',...brandAnswerSections(draft).flatMap(s=>[s.label,s.text.trim()||'Left open']),...(draft.answers.signature&&!draft.promptSet?['Earlier signature response (retained)']:[]),'Reference notes:',draft.answers.references||'Left open','Imported references:',...(draft.references||[]).map(r=>r.kind==='file'?`• File: ${r.name} (${r.size} bytes)`:`• ${r.kind==='pinterest'?'Pinterest':'Link'}: ${r.url}`)].join('\n');
}
export function deliveryEmail(value:string):string|null {const email=value.trim();return email.length<=200&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null;}
export function maySavePreview(existing:string|null):boolean {if(!existing)return true;try{return readBrandPackage(JSON.parse(existing))!==null;}catch{return false;}}
