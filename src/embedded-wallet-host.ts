import type {PresentationTrustConfig,CredentialPresentationRequestV2,CredentialPresentationV2,PresentationDisclosure} from './vendor/wallet-credential-presentation.js';
import type {ZenithMembershipCredentialV3} from './vendor/service-client.js';
// Anima host adapter. Encryption, recovery validation and the persisted snapshot
// are owned by Castalia's pinned Rust RecoverySession, not by this interface.
export interface RecoveryCore { invoke(request:string):string; }
export interface WalletSnapshotStore {
 load():Promise<string|null>;
 compareAndSwap(expected:string|null,next:string):Promise<void>;
}
export type LocalWalletState={configured:boolean;unlocked:boolean;revision:number;public_key:string|null;backup_verified:boolean;backup_eligible:boolean;membership_active:boolean};
export type PresentationPreview={token:string;summary:{disclosure:PresentationDisclosure;holder_public_key:string;caller:{kind:string;id:string};audience:string;issuer:string;key_id:string;request_digest_sha256:string;policy_digest_sha256:string;expires_at:number;confirm_by:number}};
export type PresentationIdentity={public_key:string;membership:ZenithMembershipCredentialV3};
export type DerivedWalletAccount={accountId:string;networkId:string;address:string};
export type WalletPreview={publicKey:string;restoring:boolean;chainAccounts?:readonly DerivedWalletAccount[]};
type Prepared={token:string;expected_revision:number;public_key:string;chain_accounts?:{accounts:DerivedWalletAccount[]}};
const publicPreview=(prepared:Prepared,restoring:boolean):WalletPreview=>({publicKey:prepared.public_key,restoring,
 chainAccounts:prepared.chain_accounts?.accounts.map(({accountId,networkId,address})=>({accountId,networkId,address}))});
export class EmbeddedWalletHost {
 private stored:string|null=null;
 private pending:Prepared|null=null;
 constructor(private core:RecoveryCore,private store:WalletSnapshotStore){}
 private call<T>(operation:Record<string,unknown>):T{return JSON.parse(this.core.invoke(JSON.stringify(operation))) as T;}
 private state(){return this.call<LocalWalletState>({operation:'state'});}
 async initialize(){this.stored=await this.store.load();if(this.stored!==null)this.call({operation:'observe',snapshot:this.stored});return this.state();}
 async inspect(){await this.assertCurrent();return this.state();}
 async previewCreate(password:string):Promise<WalletPreview>{
  await this.assertCurrent();this.pending=null;
  this.pending=this.call<Prepared>({operation:'prepare_create',password,created_at:Date.now(),expected_revision:this.state().revision});
  return publicPreview(this.pending,false);
 }
 async previewRestore(file:string,filePassword:string,password:string):Promise<WalletPreview>{
  await this.assertCurrent();this.pending=null;
  this.pending=this.call<Prepared>({operation:'prepare_restore',file,file_password:filePassword,password,expected_revision:this.state().revision});
  return publicPreview(this.pending,true);
 }
 async confirm():Promise<LocalWalletState>{
  const pending=this.pending;if(!pending)throw Error('Review the identity before saving it.');
  try{
   const candidate=this.call<{snapshot:string}>({operation:'commit_candidate',token:pending.token,expected_revision:pending.expected_revision});
   // Install the in-memory identity only after the complete encrypted record
   // commits. Exact-byte CAS prevents another tab's identity being replaced.
   await this.store.compareAndSwap(this.stored,candidate.snapshot);
   this.stored=candidate.snapshot;
   return this.call<LocalWalletState>({operation:'confirm_commit',token:pending.token,snapshot:candidate.snapshot});
  }catch(error){this.call({operation:'lock'});throw error;}
  finally{this.pending=null;}
 }
 cancel(){this.pending=null;this.call({operation:'cancel'});return this.state();}
 lock(){this.pending=null;this.call({operation:'lock'});return this.state();}
 async unlock(password:string){
  this.pending=null;this.stored=await this.store.load();if(this.stored===null)throw Error('No local Wallet is saved.');
  try{const state=this.call<LocalWalletState>({operation:'unlock',snapshot:this.stored,password});await this.assertCurrent();return state;}
  catch(error){this.call({operation:'lock'});throw error;}
 }
 async exportRecovery(password:string){await this.assertCurrent();return this.call<{file:string;extension:'castalia-recovery'}>({operation:'export_recovery',password});}
 async verifyBackup(file:string,password:string){
  await this.assertCurrent();this.pending=null;
  this.pending=this.call<Prepared>({operation:'verify_backup',file,password});
  return this.confirm();
 }
 // These are host-only ports. The worker supplies reviewed policy, never a
 // discovery result or page-provided issuer key. UI consent precedes each call.
 async approveMembershipTrust(trust:unknown){
  await this.assertCurrent();this.pending=null;
  this.pending=this.call<Prepared>({operation:'prepare_trust',trust});return this.confirm();
 }
 async membershipRequest(){await this.assertCurrent();return this.call<unknown>({operation:'membership_request'});}
 async activateMembership(proof:unknown){
  await this.assertCurrent();this.pending=null;
  this.pending=this.call<Prepared>({operation:'activate_membership',proof,scoped:false});return this.confirm();
 }
 async presentationIdentity(){await this.assertCurrent();return this.call<PresentationIdentity>({operation:'presentation_identity'});}
 async approvePresentationTrust(config:PresentationTrustConfig){await this.assertCurrent();return this.call<LocalWalletState>({operation:'approve_presentation_trust',config});}
 async prepareCredentialPresentation(request:CredentialPresentationRequestV2){
  await this.assertCurrent();return this.call<PresentationPreview>({operation:'prepare_credential_presentation',request:JSON.stringify(request),now:Math.floor(Date.now()/1000)});
 }
 async approveCredentialPresentation(token:string){
  await this.assertCurrent();const result=this.call<{presentation:string}>({operation:'approve_credential_presentation',token,now:Math.floor(Date.now()/1000)});
  return JSON.parse(result.presentation) as CredentialPresentationV2;
 }
 cancelCredentialPresentation(){return this.call<LocalWalletState>({operation:'cancel_credential_presentation'});}
 private async assertCurrent(){if(await this.store.load()!==this.stored){this.lock();throw Error('Wallet storage changed in another tab. Reload before continuing.');}}
}

// Anima's origin-local namespace contains the unmodified canonical encrypted
// castalia.wallet-local.v1 string. No private key or password is a host field.
export function indexedWalletStore():WalletSnapshotStore {
 const database='anima-castalia-wallet',storeName='custody',record='primary';
 const open=()=>new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open(database,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(storeName);
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Wallet storage is unavailable.'));
  request.onblocked=()=>reject(Error('Close other Wallet tabs and try again.'));
 });
 return {
  async load(){const db=await open();return new Promise<string|null>((resolve,reject)=>{
   const tx=db.transaction(storeName,'readonly'),request=tx.objectStore(storeName).get(record);let value:string|null=null;
   request.onsuccess=()=>{if(request.result!==undefined&&typeof request.result!=='string'){tx.abort();return;}value=request.result??null;};
   tx.oncomplete=()=>{db.close();resolve(value);};tx.onabort=tx.onerror=()=>{db.close();reject(Error('Wallet storage could not be read.'));};
  });},
  async compareAndSwap(expected,next){const db=await open();return new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(storeName,'readwrite'),store=tx.objectStore(storeName),request=store.get(record);let conflict=false;
   request.onsuccess=()=>{if((request.result??null)!==expected){conflict=true;tx.abort();return;}store.put(next,record);};
   tx.oncomplete=()=>{db.close();resolve();};tx.onabort=tx.onerror=()=>{db.close();reject(Error(conflict?'Wallet changed in another tab. Nothing was replaced.':'Wallet could not be saved. Reload before continuing.'));};
  });}
 };
}
