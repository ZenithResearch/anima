import type {BrandState} from '../workspace/domain.mjs';

/** A fresh instance per demo page. Never opens IndexedDB or browser storage. */
export function createDemoStore(){
 const states=new Map<string,BrandState>(),originals=new Map<string,File>();
 return {
  async load(id:string){const value=states.get(id);return value?structuredClone(value):undefined;},
  async save(id:string,state:BrandState,files:[string,File][]=[],removed:string[]=[]){
   states.set(id,structuredClone(state));
   for(const [key,file] of files)originals.set(key,file);
   for(const key of removed)originals.delete(key);
  },
  async file(id:string){return originals.get(id);}
 };
}
