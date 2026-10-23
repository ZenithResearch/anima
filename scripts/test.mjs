import {readdir,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await access(new URL('../dist/runtime/main.js',import.meta.url)).catch(()=>{throw Error('Build first: npm run build');});
const tests=(await readdir(new URL('../dist/tests/',import.meta.url))).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>`dist/tests/${name}`);
const result=spawnSync(process.execPath,['--test','--test-reporter=spec',...tests],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;process.exitCode=result.status??1;
