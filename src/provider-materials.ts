import type {BrandState} from '../workspace/domain.mjs';
export function providerMaterial(state:BrandState,assetId:string):{providerId:string;requestId:string;deliverableId:string;version:number;sha256:string;receiptIds:string[]}|null{
 const items=state.world?.providerMaterials;if(!Array.isArray(items))return null;
 const item=items.find((v:unknown)=>v!==null&&typeof v==='object'&&(v as Record<string,unknown>).assetId===assetId) as Record<string,unknown>|undefined;
 if(!item||typeof item.providerId!=='string'||typeof item.requestId!=='string'||typeof item.deliverableId!=='string'||!Number.isInteger(item.version)||typeof item.sha256!=='string')return null;
 return {providerId:item.providerId,requestId:item.requestId,deliverableId:item.deliverableId,version:item.version as number,sha256:item.sha256,receiptIds:Array.isArray(item.receiptIds)?item.receiptIds.filter((v:unknown):v is string=>typeof v==='string'):[]};
}
