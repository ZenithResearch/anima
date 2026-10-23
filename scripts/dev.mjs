import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPinterestIntegration} from '../integrations/pinterest-server.mjs';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),host='127.0.0.1',port=Number(process.env.PORT??4337);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PORT must be an integer from 1024 to 65535.');
await stat(path.join(root,'index.html')).catch(()=>{throw Error('Build first: npm run build');});
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.wasm':'application/wasm','.svg':'image/svg+xml','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8'};
// Deliberately empty configuration: inherited shell credentials cannot activate OAuth.
const pinterest=createPinterestIntegration({env:{}});
const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 if(await pinterest.handle(req,res))return;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Read-only development server');return;}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  // Preserve existing same-origin drafts, original-file stores and Wallet custody
  // while older bookmarks load the standalone source. No redirect or data copy.
  const legacy='/brands/packages/anima/production',appPath=pathname===legacy?'/':pathname.startsWith(legacy+'/')?pathname.slice(legacy.length):pathname,relative=appPath==='/'?'index.html':appPath.slice(1);
  if(relative.split('/').some(part=>part.startsWith('.')||part==='local-provider-profile.json')||relative.startsWith('api/')){res.writeHead(404);res.end('Not configured');return;}
  const filename=path.resolve(root,relative),resolved=await realpath(filename);
  if(!resolved.startsWith(root)||!(await stat(resolved)).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(resolved)]??'application/octet-stream'});
  if(req.method==='HEAD')res.end();else createReadStream(resolved).pipe(res);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,host,()=>console.log(`Anima: http://${host}:${port}/\nLocal draft and Wallet storage belong to this exact origin. No live provider routes are configured.`));
