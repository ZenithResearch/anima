// Anima host adapter. Encryption, recovery validation and the persisted snapshot
// are owned by Castalia's pinned Rust RecoverySession, not by this interface.
export interface RecoveryCore { invoke(request:string):string; }
export interface WalletSnapshotStore {
 load():Promise<string|null>;
 compareAndSwap(expected:string|null,next:string):Promise<void>;
}
export type LocalWalletState={configured:boolean;unlocked:boolean;revision:number;public_key:string|null;backup_verified:boolean;backup_eligible:boolean;membership_active:boolean};
export type WalletPreview={publicKey:string;restoring:boolean};
type Prepared={token:string;expected_revision:number;public_key:string};
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
  return {publicKey:this.pending.public_key,restoring:false};
 }
 async previewRestore(file:string,filePassword:string,password:string):Promise<WalletPreview>{
  await this.assertCurrent();this.pending=null;
  this.pending=this.call<Prepared>({operation:'prepare_restore',file,file_password:filePassword,password,expected_revision:this.state().revision});
  return {publicKey:this.pending.public_key,restoring:true};
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
