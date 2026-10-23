import type {BrandState,Asset} from '../workspace/domain.mjs';
import {readPinterestBoard,type PinterestBoard} from '../workspace/pinterest.mjs';
import {foundationDefinitions,foundationDirection,saveFoundationDirection,workspaceBrief,saveWorkspaceBrief,type FoundationId} from './workspace-marketing-model.js';
export type BoardSelection={board:PinterestBoard;foundations:FoundationId[]};
export type {PinterestSource} from '../workspace/pinterest.mjs';
export function attachPinterestBoards(state:BrandState,selections:BoardSelection[],global=false,id=()=>crypto.randomUUID(),date=new Date().toISOString()):BrandState{
 if(!selections.length||selections.length>20)throw Error('Choose between one and twenty boards.');
 const clean=selections.map(selection=>({board:readPinterestBoard(selection.board),foundations:[...new Set(selection.foundations)]}));
 if(clean.some(s=>s.foundations.some(key=>!foundationDefinitions.some(f=>f.id===key))))throw Error('Choose a known brand foundation.');
 let next={...state,assets:[...state.assets]},attached:string[]=[];
 for(const selection of clean){
  const board=selection.board;
  const found=next.assets.find(a=>(a.pinterest?.boardId===board.id&&a.pinterest.environment===board.environment)||a.kind==='link'&&a.url===board.sourceUrl);
  if(found?.pinterest&&found.pinterest.version!==1)throw Error('This Pinterest reference uses an unsupported version. It has not been changed.');
  const asset:Asset={...found,id:found?.id||id(),kind:'link',url:board.sourceUrl,name:found?.name||`Pinterest · ${board.name}`,pinterest:{...found?.pinterest,version:1,boardId:board.id,title:board.name,owner:board.owner,privacy:board.privacy,pinCount:board.pinCount,environment:board.environment,attachedAt:date}};
  next.assets=found?next.assets.map(a=>a.id===found.id?asset:a):[...next.assets,asset];attached.push(asset.id);
  // The shared brief must already be complete for any foundation assignment.
  // A library/global-only import remains available during the brand questions.
  for(const key of selection.foundations){const direction=foundationDirection(next,key);next=saveFoundationDirection(next,key,{...direction,assetIds:[...new Set([...direction.assetIds,asset.id])]});}
 }
 if(global){const brief=workspaceBrief(next);next=saveWorkspaceBrief(next,{...brief,assetIds:[...new Set([...brief.assetIds,...attached])]});}
 return next;
}
