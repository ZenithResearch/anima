// Deliberately small DTCG 2025.10 subset, not a general-purpose token resolver.
export function flatten(group,path=[],out={}){
 for(const [key,value] of Object.entries(group)){
  if(key.startsWith('$'))continue;
  if(!value||typeof value!=='object')throw Error(`Invalid token group ${[...path,key].join('.')}`);
  const name=[...path,key].join('.');
  if('$value' in value){if(!value.$type||!value.$description)throw Error(`Missing type/description: ${name}`);out[name]=value;}
  else flatten(value,[...path,key],out);
 }return out;
}
const reference=value=>typeof value==='string'&&/^\{[^{}]+\}$/.test(value)?value.slice(1,-1):null;
export const cssName=name=>'--anima-'+name.replaceAll('.','-');
export function resolve(tokens,name,seen=[]){
 if(seen.includes(name))throw Error(`Cyclic token: ${[...seen,name].join(' → ')}`);
 const token=tokens[name];if(!token)throw Error(`Missing token: ${name}`);
 const ref=reference(token.$value);
 if(ref){if(tokens[ref]?.$type!==token.$type)throw Error(`Alias type mismatch: ${name} → ${ref}`);return resolve(tokens,ref,[...seen,name]);}
 return token.$value;
}
export function valueCSS(type,value){
 switch(type){
  case 'color':{
   const {colorSpace,components,alpha=1}=value;
   if(colorSpace!=='srgb'||components.length!==3||components.some(v=>typeof v!=='number'||v<0||v>1)||alpha<0||alpha>1)throw Error('Invalid sRGB colour');
   return `rgb(${components.map(v=>Math.round(v*255)).join(' ')} / ${alpha})`;
  }
  case 'dimension':case 'duration':{
   const units=type==='dimension'?['px','rem']:['ms','s'];
   if(!Number.isFinite(value.value)||!units.includes(value.unit))throw Error(`Invalid ${type}`);
   return `${value.value}${value.unit}`;
  }
  case 'fontFamily':if(Array.isArray(value)&&value.every(v=>typeof v==='string'))return value.map(v=>['serif','sans-serif','monospace','ui-monospace'].includes(v)?v:JSON.stringify(v)).join(',');break;
  case 'cubicBezier':if(Array.isArray(value)&&value.length===4&&value.every(Number.isFinite)&&[value[0],value[2]].every(v=>v>=0&&v<=1))return `cubic-bezier(${value.join(',')})`;break;
  case 'number':if(Number.isFinite(value))return String(value);break;
 }throw Error(`Unsupported/invalid token type: ${type}`);
}
export function compile(document){
 const tokens=flatten(document);
 const lines=Object.entries(tokens).map(([name,token])=>{
  // Validate all leaves and complete alias chains even when CSS preserves aliases.
  valueCSS(token.$type,resolve(tokens,name));
  const ref=reference(token.$value);
  return `  ${cssName(name)}: ${ref?`var(${cssName(ref)})`:valueCSS(token.$type,token.$value)};`;
 });
 return `/* Generated from tokens.json. Edit the source, then run build.mjs. */\n:root{\n${lines.join('\n')}\n}\n`;
}
export function contrast(foreground,background){
 const lum=c=>c.components.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 if(foreground.alpha!==1||background.alpha!==1)throw Error('Contrast requires opaque colours, with compositing handled explicitly');
 const a=lum(foreground),b=lum(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
