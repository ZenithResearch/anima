import {readFile,writeFile} from 'node:fs/promises';
import {BrandLockup} from './runtime/brand-lockup.js';
import {arrowPlain} from './runtime/visuals.js';
const root=new URL('./',import.meta.url);
async function render(name,output,values={}){
 let source=await readFile(new URL(`templates/${name}.html`,root),'utf8');
 for(const [key,value]of Object.entries({brandLockup:BrandLockup('workspace.html',false,'workspace-home'),waterArrow:arrowPlain,teamArrow:arrowPlain,...values}))source=source.replaceAll(`{{${key}}}`,value);
 if(/\{\{[A-Za-z]+\}\}/.test(source))throw Error(`Unresolved template slot in ${name}`);
 await writeFile(new URL(output,root),source);
}
await render('workspace','workspace.html');
await render('environment','environment.html');
await render('service','service.html',{candidateMeta:'',pageTitle:'Anima — Service request',entryScript:'runtime/service-review.js'});
await render('service','service-candidate.html',{candidateMeta:'<meta name="anima-local-candidate" content="1"><meta name="anima-provider-pilot" content="1">',pageTitle:'Anima — Submission setup',entryScript:'runtime/service-candidate.js'});
