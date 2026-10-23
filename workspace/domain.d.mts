import type {PinterestSource} from './pinterest.mjs';
export type Asset={id:string;name:string;kind:'file'|'link';url?:string;type?:string;size?:number;capturePath?:string;originalName?:string;pinterest?:PinterestSource};
export type Question={id:string;label:string;hint:string;subject:string;outputs:string[]};
export type Draft={version:number;answers:Record<string,string>;origins:Record<string,string>;sourceIds:string[];step:string;activeQuestion:string;earlier:unknown[];existingBrandDetails:Record<string,string>};
export type Packet={version:number;status:string;[key:string]:unknown};
export type BrandState={version:number;brand:Record<string,string>;assets:Asset[];campaign:{assetIds:string[];[key:string]:unknown};collaboration:{roles:string[];context:string};world?:{team?:{name?:string;email?:string;role?:string}[];invitationDrafts?:{email:string}[];brandQuestionnaire?:Partial<Draft>;brandRoundtableHandoff?:Packet;pieces?:Record<string,{assetIds:string[]}>;[key:string]:unknown}};
export function emptyState():BrandState;
export function safeURL(value:unknown):string|null;
export function removeAsset(state:BrandState,id:string):BrandState;
export const brandQuestionnaireSections:{id:string;title:string;description:string;questions:Question[]}[];
export function getBrandQuestionnaire(state:BrandState):Draft;
export function activeBrandQuestion(draft:Draft):Question;
export function saveBrandQuestionnaire(state:BrandState,patch:Partial<Draft>):BrandState;
export function brandQuestionnaireProgress(draft:Draft):{answered:number;total:number;sections:{id:string;answered:number;total:number}[]};
export function prepareBrandRoundtableHandoff(state:BrandState):BrandState;
export function brandHandoffIsCurrent(packet:Packet|undefined,draft:Draft):boolean;
export function reconcileBrandHandoff(state:BrandState):BrandState;

export function addInvitationDrafts(state:BrandState,emails:string[]):BrandState;
