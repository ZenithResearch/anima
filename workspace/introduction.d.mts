export type Introduction={version:1;draftId:string;name:string;email:string;organization:string;createdAt:number};
export const INTRODUCTION_KEY:string;
export const INTRODUCTION_TTL:number;
export function validDraftId(value:unknown):value is string;
export function introductionRecord(raw:Record<string,unknown>,draftId:string,now?:number):Introduction;
export function stageIntroduction(storage:Storage,record:Introduction):void;
export function consumeIntroduction(storage:Storage,draftId:string,now?:number):Introduction|null;
