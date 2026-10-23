export const MAX_BRAND_REFERENCES=12,MAX_REFERENCE_BYTES=25*1024*1024;
export type BrandReference={id:string;kind:'file';name:string;size:number;type:string}|{id:string;kind:'link'|'pinterest';name:string;url:string};
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(id);
export function referenceURL(raw:string):string|null {
 try{const value=raw.trim();if(!value||value.length>2000)return null;const url=new URL(/^[a-z][a-z\d+.-]*:/i.test(value)?value:'https://'+value);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||!url.hostname.includes('.'))return null;
  return url.href;
 }catch{return null;}
}
export function isPinterestURL(raw:string):boolean {
 try{const host=new URL(raw).hostname.toLowerCase();return host==='pin.it'||/^(?:[a-z0-9-]+\.)*pinterest\.(?:com|co\.uk|com\.au|ca|de|fr|es|it|jp|pt|se|ch|at|nz|dk|ie|co\.kr)$/.test(host);}catch{return false;}
}
export function linkReference(raw:string,id:string):BrandReference {
 const url=referenceURL(raw);if(!url||!validId(id))throw Error('Add a complete website or Pinterest board link.');
 const pinterest=isPinterestURL(url);return {id,kind:pinterest?'pinterest':'link',name:pinterest?'Pinterest reference':new URL(url).hostname,url};
}
export function fileReference(file:Pick<File,'name'|'size'|'type'>,id:string):BrandReference {
 if(!validId(id)||!file.name.trim()||file.name.length>255||!Number.isSafeInteger(file.size)||file.size<0||file.size>MAX_REFERENCE_BYTES)throw Error('Keep each reference file under 25 MB.');
 return {id,kind:'file',name:file.name,size:file.size,type:file.type.slice(0,150)};
}
export function readReferences(raw:unknown):BrandReference[] {
 if(!Array.isArray(raw))return [];
 const result:BrandReference[]=[],ids=new Set<string>(),urls=new Set<string>();
 for(const item of raw.slice(0,MAX_BRAND_REFERENCES)){
  if(!item||typeof item!=='object'||!validId(item.id)||ids.has(item.id))continue;
  try{
   let ref:BrandReference;
   if(item.kind==='file'&&typeof item.name==='string'&&typeof item.type==='string'&&typeof item.size==='number')ref=fileReference(item,item.id);
   else if((item.kind==='link'||item.kind==='pinterest')&&typeof item.url==='string'){ref=linkReference(item.url,item.id);if(ref.kind==='file'||urls.has(ref.url))continue;urls.add(ref.url);}
   else continue;
   ids.add(ref.id);result.push(ref);
  }catch{}
 }
 return result;
}
