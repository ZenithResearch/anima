import {EmbeddedWalletHost,indexedWalletStore} from './embedded-wallet-host.js';
// The private session is reachable only inside this worker. No generic signing,
// raw-key, trust-installation or Service authorization method is exposed.
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
    default:throw Error('Unsupported Wallet operation.');
   }
   scope.postMessage({id:request.id,ok:true,value});
  }catch{
   // No passwords, file bodies or core error arguments cross the error path.
   try{(await host).lock();}catch{/* Module unavailable: no custody was installed. */}
   scope.postMessage({id:request?.id,ok:false,error:'Wallet operation could not be completed. Check the password or recovery file, then reload if storage changed. Your existing identity has not been replaced.'});
  }
 });
});
