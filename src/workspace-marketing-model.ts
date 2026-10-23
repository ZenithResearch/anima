import {brandQuestions,readBrandPackage,missingBrandQuestions,type BrandPackageDraft,type BrandQuestionId} from './brand-package-model.js';
import type {BrandState,Asset} from '../workspace/domain.mjs';
export const assetFolders=[{id:'strategy',label:'Brand strategy'},{id:'voice',label:'Voice & story'},{id:'identity',label:'Visual identity'},{id:'design-system',label:'Design system'},{id:'creative-assets',label:'Outward deliverables'},{id:'references',label:'References & source'}] as const;
export type FolderId=typeof assetFolders[number]['id'];
export type Identity={logoAssetId:string;fontFamily:string;fontAssetIds:string[];palette:string[]};
export type Seat={id:string;definition:string;name:string;provider:string;responsibilities:string[];state:'proposed'};
export type MarketingWorkspace={version:1;identity:Identity;assetFolders:Record<string,FolderId>;seats:Seat[]};
export const seatDefinitions=[
 {id:'brand-steward',name:'Brand steward',provider:'',responsibilities:['Brand purpose and positioning','Audience understanding','Brand commitments','Approval of brand direction','Consistency as the business grows']},
 {id:'creative-direction',name:'Creative direction',provider:'Zenith',responsibilities:['Creative interpretation of the brief','Narrative and art direction','Direction across touchpoints','Review of proposed deliverables','Coherence of the brand package']},
 {id:'design-production',name:'Design & production',provider:'Zenith',responsibilities:['Identity and design foundations','Reusable assets and templates','Production-ready formats','Accessibility and technical checks','Asset organization and handoff']}
] as const;
export const proposedSeats=(scope:string):Seat[]=>seatDefinitions.map(s=>({id:`${scope}:${s.id}`,definition:s.id,name:s.name,provider:s.provider,responsibilities:[...s.responsibilities],state:'proposed'}));
const text=(v:unknown,max=180)=>typeof v==='string'?v.trim().slice(0,max):'';
const strings=(v:unknown,max=24)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').slice(0,max):[];
export function parsePalette(value:string):string[]{
 const colors=value.split(/[\s,;]+/).filter(Boolean);if(colors.length>8)throw Error('Keep up to eight palette colors.');
 if(colors.some(c=>!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)))throw Error('Use hex colors such as #38213B, separated by spaces or new lines.');
 return [...new Set(colors.map(c=>c.length===4?'#'+[...c.slice(1)].map(x=>x+x).join('').toUpperCase():c.toUpperCase()))];
}
function rawWorkspace(state:BrandState):Record<string,unknown>|undefined{const raw=state.world?.marketingWorkspace;return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:undefined;}
export function marketingWorkspace(state:BrandState,scope:string):MarketingWorkspace{
 const raw=rawWorkspace(state),supported=raw?.version===1?raw:undefined;
 const identity=supported?.identity&&typeof supported.identity==='object'?supported.identity as Record<string,unknown>:{};
 const present=new Set(state.assets.map(a=>a.id));
 const assignments:Record<string,FolderId>={};
 if(supported?.assetFolders&&typeof supported.assetFolders==='object')for(const [id,folder] of Object.entries(supported.assetFolders))if(present.has(id)&&assetFolders.some(f=>f.id===folder))assignments[id]=folder as FolderId;
 const seats=proposedSeats(scope);
 if(Array.isArray(supported?.seats))for(const seat of seats){const saved=supported.seats.find(s=>s&&s.id===seat.id&&s.definition===seat.definition);if(saved){seat.name=text(saved.name)||seat.name;seat.provider=text(saved.provider);}}
 return {version:1,identity:{logoAssetId:present.has(text(identity.logoAssetId))?text(identity.logoAssetId):'',fontFamily:text(identity.fontFamily,120),fontAssetIds:strings(identity.fontAssetIds).filter(id=>present.has(id)),palette:strings(identity.palette,8).filter(c=>/^#[0-9a-f]{6}$/i.test(c)).map(c=>c.toUpperCase())},assetFolders:assignments,seats};
}
export function saveMarketingWorkspace(state:BrandState,next:MarketingWorkspace):BrandState{
 const raw=rawWorkspace(state);if(state.world?.marketingWorkspace!==undefined&&(!raw||raw.version!==1))throw Error('These workspace settings use a newer or unsupported version. They have not been changed.');
 if(next.version!==1)throw Error('Unsupported workspace settings.');
 const present=new Set(state.assets.map(a=>a.id));
 if((next.identity.logoAssetId&&!present.has(next.identity.logoAssetId))||next.identity.fontAssetIds.some(id=>!present.has(id)))throw Error('Choose an existing asset, or upload the original first.');
 const palette=parsePalette(next.identity.palette.join(' '));
 if(Object.entries(next.assetFolders).some(([id,folder])=>!present.has(id)||!assetFolders.some(f=>f.id===folder)))throw Error('Choose an existing asset and folder.');
 return {...state,world:{...state.world,marketingWorkspace:{...raw,...next,identity:{...next.identity,fontFamily:text(next.identity.fontFamily,120),palette},seats:next.seats.map(s=>({...s,name:text(s.name)||'Unnamed seat',provider:text(s.provider),state:'proposed'}))}}};
}
export function folderForAsset(state:BrandState,asset:Asset,settings:MarketingWorkspace):FolderId{
 if(settings.assetFolders[asset.id])return settings.assetFolders[asset.id]!;
 if(settings.identity.logoAssetId===asset.id||settings.identity.fontAssetIds.includes(asset.id))return 'identity';
 const folders:Record<string,FolderId>={'brand-book':'strategy',characters:'strategy',voice:'voice',identity:'identity','design-system':'design-system','creative-assets':'creative-assets'};
 for(const [piece,folder] of Object.entries(folders)){const ids=state.world?.pieces?.[piece]?.assetIds;if(Array.isArray(ids)&&ids.includes(asset.id))return folder;}
 return 'references';
}
export const isLogoAsset=(a:Asset)=>a.kind==='file'&&(/^image\//.test(a.type||'')||/\.(svg|png|webp|jpe?g|gif|avif)$/i.test(a.name));
export const isFontAsset=(a:Asset)=>a.kind==='file'&&/\.(woff2?|otf|ttf)$/i.test(a.name);

// One global brief. Legacy output selections stay readable but no longer drive UI or eligibility.
export const packageOutputs=[{id:'logo',label:'Logo'},{id:'type',label:'Typography'},{id:'palette',label:'Color palette'},{id:'brand-book',label:'Brand book'},{id:'voice',label:'Voice & story'},{id:'design-system',label:'Design system'}] as const;
export type PackageOutputId=typeof packageOutputs[number]['id'];
export type WorkspaceBrief=BrandPackageDraft&{assetIds:string[];outputs:PackageOutputId[]};
export function workspaceBrief(state:BrandState):WorkspaceBrief{
 const raw=state.world?.packageBrief as Partial<WorkspaceBrief>|undefined;
 const draft=raw?.version===1?readBrandPackage(raw):null;
 return {...(draft||{version:1 as const,promptSet:'experience-v3' as const,answers:{}}),assetIds:raw?.version===1?strings(raw.assetIds,state.assets.length).filter(id=>state.assets.some(a=>a.id===id)):[],outputs:raw?.version===1?packageOutputs.filter(o=>Array.isArray(raw.outputs)&&raw.outputs.includes(o.id)).map(o=>o.id):[]};
}
export function saveWorkspaceBrief(state:BrandState,brief:WorkspaceBrief):BrandState{
 const old=state.world?.packageBrief;
 if(old!==undefined&&(!old||typeof old!=='object'||Array.isArray(old)||(old as {version?:unknown}).version!==1))throw Error('This package brief uses an unsupported version. It has not been changed.');
 if(!readBrandPackage(brief))throw Error('Unsupported package brief.');
 if(brief.outputs.some(id=>!packageOutputs.some(o=>o.id===id))||brief.assetIds.some(id=>!state.assets.some(a=>a.id===id)))throw Error('Choose existing material and known package outputs.');
 const normalized=workspaceBrief({...state,world:{...state.world,packageBrief:brief}});
 return {...state,world:{...state.world,packageBrief:{...old,...normalized}}};
}
export function briefMissing(brief:WorkspaceBrief):BrandQuestionId[]{const missing=missingBrandQuestions(brief);return brief.assetIds.length?missing.filter(id=>id!=='references'):missing;}

// Direction is additive to the shared brief, never a separate set of brand answers.
export const foundationDefinitions=[
 {id:'logo',label:'Logo',hint:'Shapes, symbols, wordmarks, and what to avoid.'},
 {id:'type',label:'Typography',hint:'Letterforms, tone, reading rhythm, and what to avoid.'},
 {id:'palette',label:'Color palette',hint:'Color relationships, contrast, atmosphere, and what to avoid.'},
 {id:'spacing',label:'Spacing',hint:'Density, breathing room, rhythm, and how close things should feel.'},
 {id:'layout',label:'Layout',hint:'Hierarchy, composition, arrangement, and how a page should unfold.'},
 {id:'imagery',label:'Imagery',hint:'Photography, illustration, material, texture, and art direction.'},
 {id:'motion',label:'Motion',hint:'Pace, transitions, interaction, and how things should move.'},
 {id:'voice',label:'Voice & story',hint:'Language, expression, stories, and what to avoid.'}
] as const;
export type FoundationId=typeof foundationDefinitions[number]['id'];
export type FoundationDirection={notes:string;assetIds:string[]};
function rawDirections(state:BrandState):Record<string,unknown>|undefined{
 const raw=state.world?.foundationDirections;return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:undefined;
}
export function foundationDirection(state:BrandState,id:FoundationId):FoundationDirection{
 const raw=rawDirections(state),items=raw?.version===1&&raw.items&&typeof raw.items==='object'?raw.items as Record<string,unknown>:{};
 const item=items[id]&&typeof items[id]==='object'&&!Array.isArray(items[id])?items[id] as Record<string,unknown>:{};
 return {notes:typeof item.notes==='string'?item.notes.slice(0,4000):'',assetIds:[...new Set(strings(item.assetIds,state.assets.length))].filter(key=>state.assets.some(a=>a.id===key))};
}
export function saveFoundationDirection(state:BrandState,id:FoundationId,direction:FoundationDirection):BrandState{
 if(!foundationDefinitions.some(f=>f.id===id))throw Error('Choose a known brand foundation.');
 if(briefMissing(workspaceBrief(state)).length)throw Error('Complete the shared brand questions first.');
 const raw=rawDirections(state);
 if(state.world?.foundationDirections!==undefined&&(!raw||raw.version!==1||!raw.items||typeof raw.items!=='object'||Array.isArray(raw.items)))throw Error('These foundation directions use an unsupported version. They have not been changed.');
 if(typeof direction.notes!=='string'||direction.notes.length>4000||!Array.isArray(direction.assetIds)||direction.assetIds.some(key=>!state.assets.some(a=>a.id===key)))throw Error('Use up to 4,000 characters and existing references.');
 const items=(raw?.items||{}) as Record<string,unknown>,old=items[id];
 return {...state,world:{...state.world,foundationDirections:{...raw,version:1,items:{...items,[id]:{...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),notes:direction.notes,assetIds:[...new Set(direction.assetIds)]}}}}};
}
