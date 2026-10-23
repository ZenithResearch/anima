export const INTRODUCTION_KEY='anima.business.introduction.v1';
export const INTRODUCTION_TTL=30*60*1000;
export const validDraftId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function introductionRecord(raw,draftId,now=Date.now()){
 if(!validDraftId(draftId))throw Error('Create a valid workspace draft.');
 const text=(key,max)=>typeof raw?.[key]==='string'?raw[key].trim().slice(0,max):'';
 const name=text('name',100),email=text('email',200),organization=text('organization',100);
 if(!name||!organization||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Add your name, work email and brand or organization.');
 return {version:1,draftId,name,email,organization,createdAt:now};
}
export function stageIntroduction(storage,record){storage.setItem(INTRODUCTION_KEY,JSON.stringify(record));}
export function consumeIntroduction(storage,draftId,now=Date.now()){
 let raw;
 try{raw=storage.getItem(INTRODUCTION_KEY);storage.removeItem(INTRODUCTION_KEY);}catch{return null;}
 try{
  const value=JSON.parse(raw||'null');
  if(value?.version!==1||value.draftId!==draftId||!Number.isFinite(value.createdAt)||now<value.createdAt||now-value.createdAt>INTRODUCTION_TTL)return null;
  return introductionRecord(value,value.draftId,value.createdAt);
 }catch{return null;}
}
