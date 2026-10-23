import type {BrandState} from './domain.mjs';
export const brandPieces:{id:string;title:string;description:string;kind?:string;contains:string[];roles:string[]}[];
export function pieceState(state:BrandState,id:string):{assetIds:string[]};
export function connectPiece(state:BrandState,id:string,assetIds:string[]):BrandState;
export function capturePath(path:string):string;
