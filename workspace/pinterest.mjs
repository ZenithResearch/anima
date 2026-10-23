// Shared provider DTO. No credentials, media URLs or arbitrary provider fields cross this boundary.
export const pinterestBoardId=value=>typeof value==='string'&&/^\d{1,40}$/.test(value);
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export function readPinterestBoard(value){
 if(!value||value.version!==1||!pinterestBoardId(value.id)||!text(value.name,180)||!['production','sandbox'].includes(value.environment)||!['PUBLIC','SECRET','PROTECTED'].includes(value.privacy))throw Error('Pinterest returned an unsupported board.');
 return {version:1,id:value.id,name:text(value.name,180),description:text(value.description,500),owner:text(value.owner,100),pinCount:Number.isSafeInteger(value.pinCount)&&value.pinCount>=0?value.pinCount:0,privacy:value.privacy,environment:value.environment,sourceUrl:`https://${value.environment==='sandbox'?'api-sandbox':'api'}.pinterest.com/v5/boards/${value.id}`};
}
export function normalizePinterestBoard(value,environment='production'){
 return readPinterestBoard({version:1,id:value?.id,name:value?.name,description:value?.description,owner:value?.owner?.username,pinCount:value?.pin_count,privacy:value?.privacy||'PUBLIC',environment});
}
