import {EmbeddedWalletHost,indexedWalletStore} from './embedded-wallet-host.js';
import {embeddedWalletProfile,requireEmbeddedOrigin,embeddedMembershipTrust,embeddedPresentationTrust} from './embedded-wallet-profile.js';
import type {CredentialPresentationRequestV2} from './vendor/wallet-credential-presentation.js';
// The private session is reachable only inside this worker. No generic signing,
// raw-key or generic signing method is exposed. Connection trust is compiled here.
const sdk=import('../wallet-sdk/castalia_wallet_core.js');
const host=sdk.then(async module=>{await module.default();const value=new EmbeddedWalletHost(new module.WasmRecoverySession(),indexedWalletStore());await value.initialize();return value;});
const scope=self as unknown as {addEventListener(name:string,listener:(event:MessageEvent)=>void):void;postMessage(message:unknown):void};
let queue:Promise<unknown>=Promise.resolve();
scope.addEventListener('message',event=>{
 const request=event.data as {id:number;operation:string;args:unknown[]};
 queue=queue.then(async()=>{
  try{
   if(!Number.isSafeInteger(request?.id)||!Array.isArray(request.args))throw Error('Invalid Wallet operation.');
   const wallet=await host;let value:unknown;
   const text=(i:number)=>{const arg=request.args[i];if(typeof arg!=='string'||arg.length>1_048_576)throw Error('Invalid Wallet input.');return arg;};
   switch(request.operation){
    case 'state':value=await wallet.inspect();break;
    case 'create':value=await wallet.previewCreate(text(0));break;
    case 'restore':value=await wallet.previewRestore(text(0),text(1),text(2));break;
    case 'confirm':value=await wallet.confirm();break;
    case 'cancel':value=wallet.cancel();break;
    case 'unlock':value=await wallet.unlock(text(0));break;
    case 'lock':value=wallet.lock();break;
    case 'export':value=await wallet.exportRecovery(text(0));break;
    case 'verify':value=await wallet.verifyBackup(text(0),text(1));break;
    case 'connection-identity':value=await wallet.presentationIdentity();break;
    case 'join-reviewed-zenith':{
     requireEmbeddedOrigin(self.location.origin);
     // This operation follows a distinct visible membership/trust approval.
     // Only public possession proof leaves the worker; no passphrase or key.
     await wallet.approveMembershipTrust(embeddedMembershipTrust());
     const body=await wallet.membershipRequest(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
     try{
      const response=await fetch(embeddedWalletProfile.issuerOrigin+'/v3/memberships',{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      if(!response.ok)throw Error('Membership issuer unavailable.');
      const reader=response.body?.getReader();if(!reader)throw Error('Empty membership response.');
      const chunks:Uint8Array[]=[];let size=0;
      try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384)throw Error('Membership response is too large.');chunks.push(part.value);}}
      finally{await reader.cancel().catch(()=>{});}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      const proof=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
      value=await wallet.activateMembership(proof);
     }finally{clearTimeout(timeout);}
     break;
    }
    case 'approve-reviewed-receiver':value=await wallet.approvePresentationTrust(embeddedPresentationTrust(self.location.origin));break;
    case 'prepare-reviewed-presentation':{
     requireEmbeddedOrigin(self.location.origin);value=await wallet.prepareCredentialPresentation(JSON.parse(text(0)) as CredentialPresentationRequestV2);break;
    }
    case 'approve-reviewed-presentation':requireEmbeddedOrigin(self.location.origin);value=await wallet.approveCredentialPresentation(text(0));break;
    case 'cancel-presentation':value=wallet.cancelCredentialPresentation();break;
    default:throw Error('Unsupported Wallet operation.');
   }
   scope.postMessage({id:request.id,ok:true,value});
  }catch{
   // No passwords, file bodies or core error arguments cross the error path.
   try{(await host).lock();}catch{/* Module unavailable: no custody was installed. */}
   scope.postMessage({id:request?.id,ok:false,error:'Wallet operation could not be completed. Unlock again and check the connection or recovery file. Reload if storage changed. Your existing identity has not been replaced.'});
  }
 });
});
