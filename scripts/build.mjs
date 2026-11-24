import {access,cp,mkdir,rm,copyFile,readFile,writeFile,lstat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--provider-connection'&&path.isAbsolute(args[1])))throw Error('Usage: npm run build -- [--provider-connection /absolute/private/connection.json]');
let privateConnection;
if(args.length){const info=await lstat(args[1]);if(!info.isFile()||info.isSymbolicLink()||info.size>4096||(info.mode&0o077)!==0)throw Error('Use a small owner-private regular connection file (0600).');privateConnection=JSON.parse(await readFile(args[1],'utf8'));}
const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist');
const files=['package.json','tsconfig.json','build.mjs','build-foundations.mjs','build-workspace.mjs','components.mjs','copy.mjs','token-tools.mjs','check-provider-profile.mjs','tokens.json','atomic.json','ACTION-USAGE.json','PROVIDER-CLIENT-SOURCE.json','MATRIX-COMPANION-SOURCE.json','WALLET-SOURCE.json','SEALER-SOURCE.json','readiness.json'];
const directories=['src','templates','workspace','water','scene','assets','wallet-sdk','provider-contract','tests','integrations'];
const styles=['production.css','atoms.css','interactions.css','brand-lockup.css','workspace.css','service.css','wallet.css','environment.css','reference-import.css','question-fields.css','trail-picker.css','review.css','connections-fixture.css','foundations.css','workspace-demo.css'];
function run(command,args,cwd=root){const result=spawnSync(command,args,{cwd,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw Error(`${command} exited with ${result.status}`);}
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
for(const file of [...files,...styles])await copyFile(path.join(root,file),path.join(dist,file));
// Explicit source roots only: local profiles, recovery exports and browser stores are never inputs.
const excluded=name=>name==='local-provider-profile.json'||name==='local-secs-candidate'||name==='target'||name==='node_modules'||name==='runtime'||name.startsWith('.env')||/\.(?:castalia-recovery|castaway)$/.test(name);
for(const directory of directories)await cp(path.join(root,directory),path.join(dist,directory),{recursive:true,filter:source=>!excluded(path.basename(source))});
for(const page of ['components.html','wallet.html','workspace-demo.html','service-demo.html'])await copyFile(path.join(root,'pages',page),path.join(dist,page));
const compiler=path.join(root,'node_modules','typescript','bin','tsc');
await access(compiler).catch(()=>{throw Error('Install the pinned compiler first: npm ci');});
run(process.execPath,[compiler,'--project',path.join(dist,'tsconfig.json')]);
if(privateConnection){
 const {validateReviewedProviderConnection}=await import(pathToFileURL(path.join(dist,'runtime/service-connection-config.js')).href);
 const reviewed=validateReviewedProviderConnection(privateConnection),source=path.join(dist,'src/service-connection-config.ts'),text=await readFile(source,'utf8'),marker='export const reviewedProviderConnection:ReviewedProviderConnection|null=null;';
 if(!text.includes(marker))throw Error('The reviewed connection build slot changed.');
 await writeFile(source,text.replace(marker,'export const reviewedProviderConnection:ReviewedProviderConnection|null='+JSON.stringify(reviewed)+';'));
 run(process.execPath,[compiler,'--project',path.join(dist,'tsconfig.json')]);
}
// Build our own Rust source every time. Never substitute a copied anima_core.wasm.
const target=path.join(root,'.build','rust');
const cargo=spawnSync('cargo',['build','--manifest-path',path.join(root,'core','Cargo.toml'),'--target','wasm32-unknown-unknown','--release','--locked'],{cwd:root,stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}});
if(cargo.error)throw cargo.error;if(cargo.status!==0)throw Error('Rust/WASM build failed. Install Rust and rustup target add wasm32-unknown-unknown.');
await copyFile(path.join(target,'wasm32-unknown-unknown','release','anima_core.wasm'),path.join(dist,'anima_core.wasm'));
run(process.execPath,['build.mjs'],dist);
console.log(privateConnection?'Built a locally configured Anima transport test. No Wallet consent, account creation or request was performed.':'Built standalone Anima into dist. No provider, account or external connection was enabled.');
