import {randomBytes} from 'node:crypto';
import {normalizePinterestBoard,pinterestBoardId} from '../workspace/pinterest.mjs';
const base='/api/anima/pinterest',workspace='/workspace.html';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const foundations=new Set(['logo','type','palette','spacing','layout','imagery','motion','voice']);
const failure=(status,message)=>Object.assign(new Error(message),{status});
const random=()=>randomBytes(32).toString('base64url');
export function pinterestConfiguration(env=process.env){
 const id=env.PINTEREST_APP_ID||'',secret=env.PINTEREST_APP_SECRET||'',redirect=env.PINTEREST_REDIRECT_URI||'';
 let uri;try{uri=new URL(redirect);}catch{}
 const valid=uri&&!uri.username&&!uri.password&&!uri.search&&!uri.hash&&uri.pathname===base+'/callback'&&(uri.protocol==='https:'||uri.protocol==='http:'&&['127.0.0.1','localhost'].includes(uri.hostname));
 return {configured:Boolean(id&&secret&&valid),id,secret,redirect:valid?uri.href:'',origin:valid?uri.origin:'',environment:env.PINTEREST_SANDBOX==='1'?'sandbox':'production'};
}
export function createPinterestIntegration({env=process.env,fetchImpl=fetch,now=Date.now}={}){
 const config=pinterestConfiguration(env),sessions=new Map();
 const api=`https://${config.environment==='sandbox'?'api-sandbox':'api'}.pinterest.com/v5`;
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
 function send(res,status,value,extra={}){res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8',...extra});res.end(JSON.stringify(value));}
 function redirect(res,url){res.writeHead(303,{...headers,Location:url});res.end();}
 function session(req){const sid=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('anima_pinterest_session='))?.slice(24);const entry=sessions.get(sid);if(!entry||entry.expires<now()){if(entry)sessions.delete(sid);return null;}return entry;}
 function sweep(){for(const [id,s]of sessions){if(s.expires<now())sessions.delete(id);else for(const [key,p]of s.pending)if(p.expires<now())s.pending.delete(key);}}
 const origin=req=>`${req.socket?.encrypted?'https':'http'}://${req.headers.host}`;
 const configuredFor=req=>config.configured&&config.origin===origin(req);
 function sameOrigin(req){if(req.headers.origin!==origin(req)||req.headers['sec-fetch-site']==='cross-site')throw failure(403,'Open this action from the Anima workspace.');}
 async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw failure(415,'Use a JSON request.');let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>16000)throw failure(413,'Too many boards selected.');}try{const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw failure(400,'Invalid connection request.');}}
 function target(draft,context,result){const url=new URL(workspace,config.origin);url.searchParams.set('draft',draft);url.searchParams.set('pinterest',result);url.searchParams.set('pinterest-context',context);return url.href;}
 function grant(req,draft){const s=session(req),c=s?.connections.get(draft);if(!c)throw failure(401,'Connect Pinterest to choose boards.');return {s,c};}
 async function upstream(path,options){let response;try{response=await fetchImpl(api+path,{...options,redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw failure(502,'Pinterest could not be reached. Please try again.');}
  let value;try{value=await response.json();}catch{throw failure(502,'Pinterest returned an unreadable response.');}
  if(!response.ok){const status=path==='/oauth/token'&&response.status===400?401:response.status;throw failure(status===401?401:status===403?403:status===429?429:502,status===401?'Reconnect Pinterest to continue.':status===403?'Pinterest did not grant access to these boards. Check the app permissions.':status===429?'Pinterest is busy. Wait a moment, then try again.':'Pinterest could not complete that request. Try again.');}return value;
 }
 async function tokens(parameters,previous){
  const value=await upstream('/oauth/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(config.id+':'+config.secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(parameters)});
  const access=value.access_token,refresh=value.refresh_token||previous?.refresh;
  if(typeof access!=='string'||!access||access.length>16000||/[\r\n]/.test(access)||!Number.isFinite(value.expires_in)||value.expires_in<=0||refresh&&(typeof refresh!=='string'||refresh.length>16000||/[\r\n]/.test(refresh)))throw failure(502,'Pinterest returned incomplete authorization. Reconnect to try again.');
  return {access,refresh,expires:now()+Math.min(value.expires_in,31536000)*1000,scopes:typeof value.scope==='string'?value.scope.split(/[ ,]+/):previous?.scopes||[]};
 }
 async function refresh(c){if(!c.tokens.refresh)throw failure(401,'Reconnect Pinterest to continue.');return c.refreshing??=(async()=>{try{c.tokens=await tokens({grant_type:'refresh_token',refresh_token:c.tokens.refresh},c.tokens);}finally{c.refreshing=null;}})();}
 async function call(c,path){if(c.tokens.expires<=now()+30000)await refresh(c);try{return await upstream(path,{headers:{Authorization:'Bearer '+c.tokens.access}});}catch(error){if(error.status!==401)throw error;await refresh(c);return upstream(path,{headers:{Authorization:'Bearer '+c.tokens.access}});}}
 async function protectedCall(req,draft,fn){const {s,c}=grant(req,draft);try{return await fn(c);}catch(error){if(error.status===401)s.connections.delete(draft);throw error;}}
 return {async handle(req,res){
  const url=new URL(req.url,origin(req));if(!url.pathname.startsWith(base+'/'))return false;
  sweep();try{
   const path=url.pathname.slice(base.length);
   if(path==='/callback'&&req.method==='GET'){
    if(!configuredFor(req))throw failure(503,'Pinterest connection setup is incomplete.');
    const s=session(req),state=url.searchParams.get('state'),pending=s?.pending.get(state);
    if(!pending||pending.expires<now())throw failure(400,'This Pinterest sign-in has expired or belongs to another browser. Return to Anima and reconnect.');
    s.pending.delete(state); // Consume on denial, failure and success; callbacks cannot be replayed.
    if(url.searchParams.has('error')){redirect(res,target(pending.draft,pending.context,'cancelled'));return true;}
    const code=url.searchParams.get('code');if(!code||code.length>3000)throw failure(400,'Pinterest did not return an authorization code.');
    try{
     const token=await tokens({grant_type:'authorization_code',code,redirect_uri:config.redirect});
     if(pending.scopes.some(scope=>!token.scopes.includes(scope)))throw failure(403,'Pinterest did not grant the requested read permissions.');
     const account=await upstream('/user_account',{headers:{Authorization:'Bearer '+token.access}});
     if(typeof account.username!=='string'||!account.username.trim())throw failure(502,'Pinterest did not identify the connected account.');
     s.connections.set(pending.draft,{tokens:token,username:account.username.slice(0,100),secret:pending.secret,seen:new Map(),bookmarks:new Set(['']),refreshing:null});
     redirect(res,target(pending.draft,pending.context,'connected'));
    }catch{redirect(res,target(pending.draft,pending.context,'failed'));}return true;
   }
   if(req.headers['sec-fetch-site']==='cross-site')throw failure(403,'Open Pinterest from Anima.');
   if(path==='/status'&&req.method==='GET'){
    const draft=url.searchParams.get('draft');if(!uuid(draft))throw failure(400,'Choose a workspace first.');
    const c=session(req)?.connections.get(draft);send(res,200,{configured:configuredFor(req),connected:Boolean(c)&&configuredFor(req),username:c?.username||'',includeSecret:Boolean(c?.secret),environment:config.environment,reason:!config.configured?'setup_required':!configuredFor(req)?'origin_mismatch':null});return true;
   }
   if(!configuredFor(req))throw failure(503,'Pinterest is not configured on this server yet. Board links still work.');
   if(path==='/connect'&&req.method==='POST'){
    sameOrigin(req);const value=await body(req);if(!uuid(value.draft)||!['library','global',...foundations].includes(value.context))throw failure(400,'Choose a workspace and reference destination.');
    let s=session(req);if(!s){if(sessions.size>=500)throw failure(503,'Too many connection sessions. Try again later.');const id=random();s={id,expires:now()+86400000,connections:new Map(),pending:new Map()};sessions.set(id,s);res.setHeader('Set-Cookie',`anima_pinterest_session=${id}; Path=${base}; HttpOnly; SameSite=Lax; Max-Age=86400${config.origin.startsWith('https:')?'; Secure':''}`);}
    if(!s.connections.has(value.draft)&&s.connections.size>=20)throw failure(429,'Disconnect an unused workspace connection first.');
    if(s.pending.size>=10)throw failure(429,'Finish or cancel an existing Pinterest sign-in first.');
    const state=random(),secret=value.includeSecret===true,scopes=['boards:read','user_accounts:read',...(secret?['boards:read_secret']:[])];s.pending.set(state,{draft:value.draft,context:value.context,secret,scopes,expires:now()+600000});
    const authorize=new URL('https://www.pinterest.com/oauth/');for(const [key,val]of Object.entries({client_id:config.id,redirect_uri:config.redirect,response_type:'code',scope:scopes.join(','),state}))authorize.searchParams.set(key,val);
    send(res,200,{url:authorize.href});return true;
   }
   if(path==='/disconnect'&&req.method==='POST'){
    sameOrigin(req);const value=await body(req);if(!uuid(value.draft))throw failure(400,'Choose a workspace.');const s=session(req);s?.connections.delete(value.draft);if(s)for(const [key,p]of s.pending)if(p.draft===value.draft)s.pending.delete(key);
    send(res,200,{connected:false});return true;
   }
   if(path==='/boards'&&req.method==='GET'){
    const draft=url.searchParams.get('draft'),bookmark=url.searchParams.get('bookmark')||'';if(!uuid(draft)||bookmark.length>3000)throw failure(400,'Invalid board page.');
    const page=await protectedCall(req,draft,async c=>{
     if(!c.bookmarks.has(bookmark))throw failure(400,'Load boards from the first page.');
     const query=new URLSearchParams({page_size:'25'});if(bookmark)query.set('bookmark',bookmark);
     const raw=await call(c,'/boards?'+query);if(!Array.isArray(raw.items)||raw.items.length>100)throw failure(502,'Pinterest returned an unsupported board list.');
     const boards=raw.items.map(item=>normalizePinterestBoard(item,config.environment));if(c.seen.size+boards.filter(b=>!c.seen.has(b.id)).length>5000)throw failure(429,'Reconnect Pinterest to start a new board selection.');for(const b of boards)c.seen.set(b.id,b);
     const next=typeof raw.bookmark==='string'&&raw.bookmark.length<=3000?raw.bookmark:null;if(next){if(c.bookmarks.size>=500)throw failure(429,'Reconnect Pinterest to start a new board selection.');c.bookmarks.add(next);}
     return {boards,bookmark:next};
    });send(res,200,page);return true;
   }
   if(path==='/resolve'&&req.method==='POST'){
    sameOrigin(req);const value=await body(req);if(!uuid(value.draft)||!Array.isArray(value.ids)||!value.ids.length||value.ids.length>20||value.ids.some(id=>!pinterestBoardId(id)))throw failure(400,'Choose up to 20 Pinterest boards.');
    const boards=await protectedCall(req,value.draft,async c=>{
     const ids=[...new Set(value.ids)];if(ids.some(id=>!c.seen.has(id)))throw failure(403,'Choose boards from the connected account list.');
     const result=[];for(let i=0;i<ids.length;i+=4)result.push(...await Promise.all(ids.slice(i,i+4).map(async id=>{const b=normalizePinterestBoard(await call(c,'/boards/'+id),config.environment);if(b.id!==id)throw failure(502,'Pinterest returned a different board.');return b;})));return result;
    });send(res,200,{boards});return true;
   }
   send(res,404,{error:'Pinterest action not found.'});return true;
  }catch(error){send(res,error.status||500,{error:error.status?error.message:'The Pinterest connection could not finish. Please try again.'});return true;}
 }};
}
