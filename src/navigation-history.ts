// Additive navigation metadata only: no form values, draft contents or contact data.
const key='anima.intake.navigation.v1';
interface NavigationEntry {href:string;previous:string|null;menu?:boolean}
export function navigationEntry(state:unknown):NavigationEntry|null {
 if(!state||typeof state!=='object')return null;
 const value=(state as Record<string,unknown>)[key];
 if(!value||typeof value!=='object')return null;
 const entry=value as Record<string,unknown>;
 return typeof entry.href==='string'&&(entry.previous===null||typeof entry.previous==='string')?entry as unknown as NavigationEntry:null;
}
export function navigationState(state:unknown,href:string,previous:string|null,menu=false):Record<string,unknown> {
 return {...(state&&typeof state==='object'&&!Array.isArray(state)?state:{}),[key]:{href,previous,menu}};
}
export function canNavigateBack(state:unknown,href:string):boolean {
 const entry=navigationEntry(state);
 if(entry?.href!==href||!entry.previous)return false;
 try{return new URL(entry.previous).origin===new URL(href).origin;}catch{return false;}
}
