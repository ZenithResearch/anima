import type {EmbeddedWalletClient} from './embedded-wallet-client.js';
import type {PresentationPreview} from './embedded-wallet-host.js';
import type {ServiceWallet} from './service-wallet.js';
// Same worker/session as unlock, enrollment and receiver-policy approval.
// No extension/global provider and no secondary WasmWallet is consulted.
export function embeddedServiceWallet(client:EmbeddedWalletClient,review:(preview:PresentationPreview)=>Promise<boolean>):ServiceWallet {
 let presenting=false;
 return {
  async getStatus(){const state=await client.state();return state.unlocked&&state.backup_eligible&&state.membership_active?{state:'ready' as const,publicIdentity:state.public_key??undefined}:{state:'locked' as const};},
  async getMembership(){return (await client.connectionIdentity()).membership;},
  async getCapabilities(){return ['credential_presentation_v2'];},
  async presentCredential(request){
   if(presenting)return {state:'unavailable',reason:'Review the open Wallet request first.'};
   presenting=true;
   try{
    const preview=await client.preparePresentation(request);
    if(!await review(preview)){await client.cancelPresentation();return {state:'denied',reason:'Wallet approval cancelled.'};}
    return {state:'approved',presentation:await client.approvePresentation(preview.token)};
   }catch{
    await client.cancelPresentation().catch(()=>{});
    return {state:'unavailable',reason:'Wallet approval expired, locked or changed. Review the request again.'};
   }finally{presenting=false;}
  }
 };
}
