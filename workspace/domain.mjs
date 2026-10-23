// Business domain recovered from the latest Juiced workspace. V2 evidence and legacy questionnaire compatibility retained.
import {brandPieces} from './brand-pieces.mjs';
import {legacyBrandQuestionnaireSections} from './questionnaire-legacy.mjs';
export const collections=['Strategy & story','Identity & assets','References & ideas'];
export const roles=['Creative direction','Design & production','Creators & distribution'];
export function emptyState(){
 return {version:1,brand:{name:'',description:'',audience:'',voice:''},assets:[],campaign:{title:'',objective:'',audience:'',format:'Online + real world',deliverables:'',assetIds:[]},collaboration:{roles:[],context:''}};
}
export function safeURL(value){
 try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export function assetCollection(name){
 return /\.(png|jpe?g|webp|gif|svg|mp4|mov|ai|psd|fig)$/i.test(name)?collections[1]:collections[0];
}
export function removeAsset(state,id){
 return {...state,assets:state.assets.filter(asset=>asset.id!==id),campaign:{...state.campaign,assetIds:state.campaign.assetIds.filter(value=>value!==id)}};
}
export function handoff(state){
 const included=new Set(state.campaign.assetIds);
 return {brand:{...state.brand},campaign:{...state.campaign,assetIds:undefined},collaboration:{...state.collaboration},assets:state.assets.filter(asset=>included.has(asset.id)).map(({id,name,collection,kind,url,type})=>({id,name,collection,kind,url,type}))};
}
export function briefText(state){
 const brief=handoff(state);
 return [`${brief.brand.name||'Brand'} / ${brief.campaign.title||'Campaign draft'}`,'',brief.brand.description,`Audience: ${brief.campaign.audience||brief.brand.audience||'To define together'}`,`Brand voice: ${brief.brand.voice||'To define together'}`,'',`Objective: ${brief.campaign.objective||'To define together'}`,`Where: ${brief.campaign.format}`,`What we’re making: ${brief.campaign.deliverables||'To define together'}`,`Creative partners: ${brief.collaboration.roles.join(', ')||'To define together'}`,brief.collaboration.context,'','Included source material:',...brief.assets.map(a=>`• ${a.name}${a.url?' — '+a.url:''}`)].filter(line=>line!==undefined).join('\n');
}

// Invitation drafts are local planning records, never team membership or proof of delivery.
export function addInvitationDrafts(state,emails){
 const requested=[...new Set(emails.map(email=>String(email).trim().toLowerCase()).filter(Boolean))];
 if(!requested.length||requested.some(email=>!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)))throw new Error('Enter valid email addresses, separated by commas.');
 const drafts=state.world?.invitationDrafts||[];
 const existing=new Set([...drafts,...(state.world?.team||[])].map(person=>person.email?.toLowerCase()).filter(Boolean));
 const additions=requested.filter(email=>!existing.has(email)).map(email=>({email}));
 if(!additions.length)return state;
 return {...state,world:{...state.world,invitationDrafts:[...drafts,...additions]}};
}

// V2 collects original fragments. Asset definitions remain the roundtable’s work.
export const brandQuestionnaireSections=[
 {
  "id": "brand-book",
  "title": "The ember",
  "description": "The founder, or the person carrying it forward.",
  "questions": [
   {
    "id": "firstPull",
    "label": "Before this was a plan, what kept pulling at you?",
    "hint": "Take us into a moment that helps us feel why. If you joined later, what made you stay? There does not need to be one grand beginning.",
    "subject": "founder-or-steward",
    "outputs": [
     "brand-book",
     "voice"
    ]
   },
   {
    "id": "costlyConviction",
    "label": "Which part would you protect if it made the road longer?",
    "hint": "Remember a small choice that cost time, ease or money because the easier way felt wrong. If it is a promise you have not tested yet, that belongs here too.",
    "subject": "brand-in-action",
    "outputs": [
     "brand-book",
     "design-system"
    ]
   }
  ]
 },
 {
  "id": "characters",
  "title": "The threshold",
  "description": "The people whose lives this work enters.",
  "questions": [
   {
    "id": "arrivalScene",
    "label": "Someone finds you at just the right moment. What has just happened in their life?",
    "hint": "Think of one person, rather than a whole audience. What occupied their day before you entered it? Tell us what you have seen, or what you are still imagining.",
    "subject": "people-served",
    "outputs": [
     "characters",
     "brand-book"
    ]
   },
   {
    "id": "desireAndContinuity",
    "label": "What are they reaching for—and what are they trying to keep?",
    "hint": "A desire can sit beside something they do not want to lose. A conversation, an ordinary decision or a hunch can give us a thread to follow.",
    "subject": "people-served",
    "outputs": [
     "characters",
     "voice"
    ]
   }
  ]
 },
 {
  "id": "voice",
  "title": "The gathering",
  "description": "The brand, alive in an exchange between people.",
  "questions": [
   {
    "id": "overheardMoment",
    "label": "Let us overhear a moment that felt completely like you.",
    "hint": "An exchange inside your team, or with a customer. What was said or done? Rough words, a message or a tiny incident are enough.",
    "subject": "brand-in-relationship",
    "outputs": [
     "voice",
     "brand-book"
    ]
   },
   {
    "id": "smallAct",
    "label": "What small act would tell someone they’re in the right place?",
    "hint": "A greeting, a habit, a quiet detail or the way you respond when a plan goes wrong. It might already happen, or be something you want to make possible.",
    "subject": "brand-in-relationship",
    "outputs": [
     "voice",
     "characters",
     "design-system"
    ]
   }
  ]
 },
 {
  "id": "identity",
  "title": "The atmosphere",
  "description": "Places, objects and memories that carry a feeling.",
  "questions": [
   {
    "id": "feltPlace",
    "label": "Take us somewhere you’ve felt the feeling you want to give people.",
    "hint": "A room, a song, a shop, a landscape, a scene. What small detail brings it back—the light, a material, the pace, the way you were treated?",
    "subject": "founder-or-steward",
    "outputs": [
     "identity",
     "design-system"
    ]
   },
   {
    "id": "returningFragment",
    "label": "Is there something you keep returning to? What does it hold for you?",
    "hint": "A note, a song, an object, an image or a memory. It can be ordinary. A stranger may miss what matters about it. You can also leave this one.",
    "subject": "founder-or-steward",
    "outputs": [
     "identity",
     "brand-book"
    ]
   }
  ]
 },
 {
  "id": "design-system",
  "title": "The echo",
  "description": "What travels with the work as other people bring it to life.",
  "questions": [
   {
    "id": "withoutTheSign",
    "label": "The name and logo disappear. What could still give you away?",
    "hint": "Choose a detail in how you make something or treat someone. Something already recognisable is useful; something you hope to become is a different, equally useful starting point.",
    "subject": "brand-in-action",
    "outputs": [
     "identity",
     "voice",
     "design-system"
    ]
   },
   {
    "id": "ordinaryTuesday",
    "label": "Your world meets an ordinary Tuesday. Where does someone feel it?",
    "hint": "Follow one real encounter: a screen, a parcel, a message, a shop or a conversation. What happens there? What should survive when somebody else makes it?",
    "subject": "brand-in-relationship",
    "outputs": [
     "design-system",
     "characters"
    ]
   }
  ]
 }
];

const questionnaireQuestions=brandQuestionnaireSections.flatMap(section=>section.questions);
export const questionnaireOrigins=[['','Leave open'],['lived','Something that happened'],['imagined','A possibility'],['mixed','A bit of both'],['uncertain','Not sure yet']];
function legacySnapshot(saved){return {...saved,version:saved.version||1,sections:legacyBrandQuestionnaireSections,answers:{...saved.answers},sourceIds:[...(saved.sourceIds||[])]};}
export function getBrandQuestionnaire(state){
 const saved=state.world?.brandQuestionnaire||{},current=saved.version===2;
 const answers=Object.fromEntries(questionnaireQuestions.map(q=>[q.id,current&&typeof saved.answers?.[q.id]==='string'?saved.answers[q.id]:'']));
 const origins=Object.fromEntries(questionnaireQuestions.map(q=>[q.id,current&&questionnaireOrigins.some(([value])=>value===saved.origins?.[q.id])?saved.origins[q.id]:'']));
 const available=new Set((state.assets||[]).map(asset=>asset.id));
 const sourceIds=[...new Set(Array.isArray(saved.sourceIds)?saved.sourceIds:[...available])].filter(id=>available.has(id));
 const step=current&&(brandQuestionnaireSections.some(section=>section.id===saved.step)||['materials','review'].includes(saved.step))?saved.step:'materials';
 const section=brandQuestionnaireSections.find(section=>section.id===step)||brandQuestionnaireSections[0];
 const activeQuestion=section.questions.some(q=>q.id===saved.activeQuestion)?saved.activeQuestion:section.questions[0].id;
 const earlier=[...(state.world?.brandQuestionnaireHistory||[]),...(!current&&state.world?.brandQuestionnaire?[legacySnapshot(saved)]:[])];
 return {version:2,answers,origins,sourceIds,step,activeQuestion,earlier,existingBrandDetails:{...state.brand}};
}
export function activeBrandQuestion(draft){
 const section=brandQuestionnaireSections.find(section=>section.id===draft.step)||brandQuestionnaireSections[0];
 return section.questions.find(q=>q.id===draft.activeQuestion)||section.questions[0];
}
export function brandHandoffIsCurrent(packet,draft){
 return packet?.version===2&&packet.status==='prepared'&&JSON.stringify(packet.answers)===JSON.stringify(draft.answers)&&JSON.stringify(packet.origins)===JSON.stringify(draft.origins)&&JSON.stringify(packet.sourceIds)===JSON.stringify(draft.sourceIds)&&JSON.stringify(packet.existingBrandDetails)===JSON.stringify(draft.existingBrandDetails);
}
export function saveBrandQuestionnaire(state,patch){
 const old=state.world?.brandQuestionnaire,current=old?.version===2,draft=getBrandQuestionnaire(state);
 if(old?.version>2)throw new Error('This draft uses a newer questionnaire. Keep it in its original version.');
 const answers={...(current?old.answers:{}),...draft.answers},origins={...(current?old.origins:{}),...draft.origins};
 for(const question of questionnaireQuestions){
  if(Object.hasOwn(patch.answers||{},question.id)){
   const value=patch.answers[question.id];if(typeof value!=='string'||value.length>4000)throw new Error('Keep each fragment under 4,000 characters.');answers[question.id]=value;
  }
  if(Object.hasOwn(patch.origins||{},question.id)){
   const value=patch.origins[question.id];if(!questionnaireOrigins.some(([allowed])=>allowed===value))throw new Error('Choose where this fragment comes from, or leave it open.');origins[question.id]=value;
  }
 }
 const available=new Set((state.assets||[]).map(asset=>asset.id));
 const sourceIds=[...new Set(Array.isArray(patch.sourceIds)?patch.sourceIds:draft.sourceIds)].filter(id=>available.has(id));
 const step=brandQuestionnaireSections.some(section=>section.id===patch.step)||['materials','review'].includes(patch.step)?patch.step:draft.step;
 const section=brandQuestionnaireSections.find(section=>section.id===step)||brandQuestionnaireSections[0];
 const activeQuestion=section.questions.some(q=>q.id===patch.activeQuestion)?patch.activeQuestion:section.questions.some(q=>q.id===draft.activeQuestion)?draft.activeQuestion:section.questions[0].id;
 const nextDraft={...(current?old:{}),version:2,answers,origins,sourceIds,step,activeQuestion};
 const packet=state.world?.brandRoundtableHandoff;
 const changed=packet?.version===2&&!brandHandoffIsCurrent(packet,getBrandQuestionnaire({...state,world:{...state.world,brandQuestionnaire:nextDraft}}));
 return {...state,world:{...state.world,brandQuestionnaire:nextDraft,...(old&&!current?{brandQuestionnaireHistory:[...(state.world?.brandQuestionnaireHistory||[]),legacySnapshot(old)]}:{}),...(changed?{brandRoundtableHandoff:{...packet,status:'needs-update'}}:{})}};
}
export function brandQuestionnaireProgress(draft){
 const sections=brandQuestionnaireSections.map(section=>({id:section.id,answered:section.questions.filter(q=>String(draft.answers?.[q.id]||'').trim()).length,total:section.questions.length}));
 return {answered:sections.reduce((sum,section)=>sum+section.answered,0),total:questionnaireQuestions.length,sections};
}
export function prepareBrandRoundtableHandoff(state){
 const draft=getBrandQuestionnaire(state);
 if(!brandQuestionnaireProgress(draft).answered&&!draft.sourceIds.length&&!draft.earlier.some(old=>Object.values(old.answers||{}).some(value=>String(value).trim())))throw new Error('Bring a fragment or a file before preparing the handoff.');
 const ids=new Set(draft.sourceIds);
 const sources=(state.assets||[]).filter(source=>ids.has(source.id)).map(({id,name,kind,url,type,size,capturePath,originalName})=>({id,name,kind,...(url?{url}:{}),...(type?{type}:{}),...(size!==undefined?{size}:{}),...(capturePath?{capturePath}:{}),...(originalName?{originalName}:{})}));
 const evidence=questionnaireQuestions.filter(q=>draft.answers[q.id].trim()).map(q=>({questionId:q.id,prompt:q.label,subject:q.subject,text:draft.answers[q.id],basis:draft.origins[q.id]||'unspecified',mayInform:[...q.outputs]}));
 const packet={version:2,questionnaireVersion:2,destination:'creative-roundtable',workflow:'brand-package',status:'prepared',existingBrandDetails:{...state.brand},answers:{...draft.answers},origins:{...draft.origins},sourceIds:[...draft.sourceIds],sources,evidence,interpretations:[],earlierQuestionnaires:draft.earlier,openThreads:questionnaireQuestions.filter(q=>!draft.answers[q.id].trim()).map(q=>({questionId:q.id,prompt:q.label})),practicalFollowUps:['Confirm the actual offer and any unsupported claims from source material.','Confirm accessibility, language, platform, licensing and production constraints before making a design system.'],outputs:brandPieces.filter(piece=>piece.kind!=='collection').map(piece=>({id:piece.id,title:piece.title,questionIds:questionnaireQuestions.filter(q=>q.outputs.includes(piece.id)).map(q=>q.id)})),interpretationRules:['Keep the respondent’s words separate from proposed creative interpretations.','Tie each proposed reading to evidence and uncertainty, and invite correction.','Do not infer audience preferences from founder taste or assign personality/clinical types from metaphors.'],fileStorage:'Original files remain in this browser’s IndexedDB files store, keyed by source ID. This packet contains references, not file bodies.'};
 const previous=state.world?.brandRoundtableHandoff;
 return {...state,world:{...state.world,brandRoundtableHandoff:packet,...(previous&&previous.version!==2?{brandRoundtableHandoffHistory:[...(state.world?.brandRoundtableHandoffHistory||[]),previous]}:{})}};
}

// Anima integration: details can be edited outside the discovery dialog too.
// Preserve original packet data, but never leave an outdated v2 result ready.
export function reconcileBrandHandoff(state){
 const packet=state.world?.brandRoundtableHandoff;
 if(packet?.version===2&&packet.status==='prepared'&&!brandHandoffIsCurrent(packet,getBrandQuestionnaire(state)))return {...state,world:{...state.world,brandRoundtableHandoff:{...packet,status:'needs-update'}}};
 return state;
}

