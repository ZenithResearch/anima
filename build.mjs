import {readFile,writeFile} from 'node:fs/promises';
import {copy} from './copy.mjs';
import {Document,escape} from './components.mjs';
import {contracts,engineeringRules} from './runtime/contracts.js';
import {BrandLockup} from './runtime/brand-lockup.js';
import {arrowLens,arrowLink,arrowPlain,arrowBack} from './runtime/visuals.js';
import {OPPORTUNITY_GROUPS} from './water/talent-opportunities.mjs';
const root=new URL('./',import.meta.url);
const slots={lens:arrowLens,link:arrowLink,plain:arrowPlain,backArrow:arrowBack};
function fill(source,values={}){let result=source;for(const [key,value]of Object.entries({...slots,...values}))result=result.replaceAll(`{{${key}}}`,value);if(/\{\{[A-Za-z]+\}\}/.test(result))throw Error('Unresolved authored template slot');return result;}
const template=async(name,values={})=>fill(await readFile(new URL(`templates/${name}.html`,root),'utf8'),values);
const opportunities=OPPORTUNITY_GROUPS.map(group=>`<details class="opportunity-group"><summary>${escape(group.label)}<span data-opportunity-count></span></summary><div class="opportunity-options">${group.options.map(option=>`<label class="check"><input name="${option.key}" type="checkbox" value="yes" aria-describedby="opportunity-note"><span>${escape(option.label)}<small>${escape(option.description)}</small></span></label>`).join('')}</div></details>`).join('');
const [header,introductions,process,brief,footer,disclosure,character]=await Promise.all([
 template('header',{brandLockup:BrandLockup('#water',true)}),template('introductions',{talentOpportunities:opportunities}),template('process'),template('project-brief'),template('footer'),template('disclosure'),template('character')
]);
await writeFile(new URL('index.html',root),Document(copy,{header,introductions,process,brief,footer,disclosure,character}));
await writeFile(new URL('COMPONENTS.json',root),JSON.stringify({version:1,stack:'HTML / TypeScript / Rust / WebAssembly',rules:engineeringRules,components:contracts},null,2)+'\n');
const gallery=fill(await readFile(new URL('components.html',root),'utf8'));
await writeFile(new URL('components.html',root),gallery);
await import('./build-workspace.mjs');
await import('./build-foundations.mjs');
console.log('Built authored application pages and the atomic component reference.');
