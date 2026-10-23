import type {BrandState} from './domain.mjs';
export function load(id:string):Promise<BrandState|undefined>;
export function save(id:string,state:BrandState,files?:[string,File][],removed?:string[]):Promise<void>;
export function file(id:string):Promise<File|undefined>;
