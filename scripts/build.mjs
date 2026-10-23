import {access,cp,mkdir,rm,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist');
const files=['package.json','tsconfig.json','build.mjs','build-foundations.mjs','build-workspace.mjs','components.mjs','copy.mjs','token-tools.mjs','check-provider-profile.mjs','tokens.json','atomic.json','ACTION-USAGE.json','PROVIDER-CLIENT-SOURCE.json','WALLET-SOURCE.json','SEALER-SOURCE.json','readiness.json'];
const directories=['src','templates','workspace','water','scene','assets','wallet-sdk','provider-contract','tests','integrations'];
const styles=['production.css','atoms.css','interactions.css','brand-lockup.css','workspace.css','service.css','wallet.css','environment.css','reference-import.css','question-fields.css','trail-picker.css','review.css','foundations.css','workspace-demo.css'];
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
// Build our own Rust source every time. Never substitute a copied anima_core.wasm.
const target=path.join(root,'.build','rust');
const cargo=spawnSync('cargo',['build','--manifest-path',path.join(root,'core','Cargo.toml'),'--target','wasm32-unknown-unknown','--release','--locked'],{cwd:root,stdio:'inherit',env:{...process.env,CARGO_TARGET_DIR:target}});
if(cargo.error)throw cargo.error;if(cargo.status!==0)throw Error('Rust/WASM build failed. Install Rust and rustup target add wasm32-unknown-unknown.');
await copyFile(path.join(target,'wasm32-unknown-unknown','release','anima_core.wasm'),path.join(dist,'anima_core.wasm'));
run(process.execPath,['build.mjs'],dist);
console.log('Built standalone Anima into dist. No provider, account or external connection was enabled.');
