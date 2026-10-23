import type {CharacterAnswers,CharacterKind,CharacterRole} from './character-model.js';
export type CharacterDraft={id:string;kind:CharacterKind;name:string;profileInput:string;answers:CharacterAnswers;step:number};
export const worksheetRole=(kind:CharacterKind):CharacterRole=>kind==='icp'?'icp':'creator';
export function profileLinks(input:string):{links:string[];error:string} {
 const lines=input.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 if(lines.length>8)return {links:[],error:'Use up to eight profile links for this character.'};
 const links:string[]=[];
 for(const line of lines){try{const url=new URL(line);if(url.protocol!=='https:'||url.username||url.password)throw new Error();if(!links.includes(url.href))links.push(url.href);}catch{return {links:[],error:'Use a full https:// profile link, one per line. Leave out passwords or access links.'};}}
 return {links,error:''};
}
// In-tab drafts are not member identities or persisted account records.
export class CharacterWorkspace {
 private drafts:CharacterDraft[]=[];
 private selected='';
 private last:Partial<Record<CharacterKind,string>>={};
 constructor(private id:()=>string=()=>crypto.randomUUID()){this.create('creator');this.create('icp');this.create('talent');this.selectKind('creator');}
 get active():CharacterDraft {return this.drafts.find(draft=>draft.id===this.selected)!;}
 get canCreate():boolean {return this.drafts.length<16;}
 list(kind:CharacterKind):readonly CharacterDraft[]{return this.drafts.filter(draft=>draft.kind===kind);}
 create(kind:CharacterKind):CharacterDraft {
  if(!this.canCreate)throw new Error('Keep up to sixteen character drafts in this tab.');
  const draft={id:this.id(),kind,name:'',profileInput:'',answers:{},step:0};this.drafts.push(draft);this.select(draft.id);return draft;
 }
 select(id:string):CharacterDraft {const draft=this.drafts.find(d=>d.id===id);if(!draft)throw new Error('Unknown character draft.');this.selected=id;this.last[draft.kind]=id;return draft;}
 selectKind(kind:CharacterKind):CharacterDraft {const id=this.last[kind];return id?this.select(id):this.create(kind);}
 discard():CharacterDraft {
  const {id,kind}=this.active;this.drafts=this.drafts.filter(d=>d.id!==id);delete this.last[kind];
  const next=this.list(kind).at(-1);return next?this.select(next.id):this.create(kind);
 }
}
