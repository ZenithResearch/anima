import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {initSync,WasmRecoverySession} from '../wallet-sdk/castalia_wallet_core.js';
import {EmbeddedWalletHost} from '../runtime/embedded-wallet-host.js';
initSync({module:await readFile(new URL('../wallet-sdk/castalia_wallet_core_bg.wasm',import.meta.url))});
const password='Disposable test password only 123';
const backupPassword='Disposable backup password 123';
function fixture(store){
 const core=new WasmRecoverySession();let record=null,fail=false;
 const own={load:async()=>record,compareAndSwap:async(expected,next)=>{if(fail)throw Error('Disk unavailable');assert.equal(record,expected,'CAS must match exact old bytes');record=next;}};
 return {core,host:new EmbeddedWalletHost(core,store||own),record:()=>record,set:value=>{record=value;},fail:()=>{fail=true;}};
}
test('real core stages identity, commits encrypted canonical snapshot, then unlocks exact saved identity',async()=>{
 const f=fixture();try{
  assert.equal((await f.host.initialize()).configured,false);
  const preview=await f.host.previewCreate(password);assert.match(preview.publicKey,/^[a-f0-9]{64}$/);assert.equal(f.record(),null);
  const saved=await f.host.confirm();assert.equal(saved.public_key,preview.publicKey);assert.equal(saved.backup_verified,false);assert.equal(saved.membership_active,false);
  const raw=f.record();assert.equal(JSON.parse(raw).schema,'castalia.wallet-local.v1');assert.ok(!raw.includes(password));
  f.host.lock();assert.equal((await f.host.inspect()).unlocked,false);
  await assert.rejects(f.host.unlock('wrong password'));assert.equal((await f.host.inspect()).unlocked,false);
  assert.equal((await f.host.unlock(password)).public_key,preview.publicKey);
  await assert.rejects(f.host.previewCreate(password));assert.equal(f.record(),raw);
 }finally{f.core.free();}
});
test('downloaded encrypted recovery restores same identity and tested-backup state without exporting authority',async()=>{
 const f=fixture(),target=fixture();try{
  await f.host.initialize();const preview=await f.host.previewCreate(password);await f.host.confirm();
  const backup=await f.host.exportRecovery(backupPassword);assert.equal(backup.extension,'castalia-recovery');assert.equal(JSON.parse(backup.file).schema,'castalia.wallet-custody.v1');assert.ok(!backup.file.includes(password));assert.ok(!backup.file.includes(backupPassword));
  assert.equal((await f.host.verifyBackup(backup.file,backupPassword)).backup_verified,true);
  await target.host.initialize();assert.equal((await target.host.previewRestore(backup.file,backupPassword,'Different local password 123')).publicKey,preview.publicKey);
  assert.equal(target.record(),null);const restored=await target.host.confirm();assert.equal(restored.public_key,preview.publicKey);assert.equal(restored.backup_verified,true);assert.equal(restored.membership_active,false);
  assert.notEqual(target.record(),f.record());target.host.lock();await assert.rejects(target.host.unlock(password));
  assert.equal((await target.host.unlock('Different local password 123')).public_key,preview.publicKey);
 }finally{f.core.free();target.core.free();}
});
test('cancel, failed persistence, stale tabs and attempted replacement never install a speculative identity',async()=>{
 const cancelled=fixture(),failed=fixture(),stale=fixture();try{
  await cancelled.host.initialize();await cancelled.host.previewCreate(password);cancelled.host.cancel();await assert.rejects(cancelled.host.confirm());assert.equal(cancelled.record(),null);
  await failed.host.initialize();await failed.host.previewCreate(password);failed.fail();await assert.rejects(failed.host.confirm(),/Disk/);assert.equal(failed.record(),null);assert.equal((await failed.host.inspect()).unlocked,false);
  await stale.host.initialize();await stale.host.previewCreate(password);stale.set('another tab encrypted record');await assert.rejects(stale.host.confirm());assert.equal(stale.record(),'another tab encrypted record');
 }finally{cancelled.core.free();failed.core.free();stale.core.free();}
});
test('a recovery file for another identity cannot mark current backup verified',async()=>{
 const a=fixture(),b=fixture();try{
  for(const f of [a,b]){await f.host.initialize();await f.host.previewCreate(password);await f.host.confirm();}
  const before=a.record(),backup=await b.host.exportRecovery(backupPassword);
  await assert.rejects(a.host.verifyBackup(backup.file,backupPassword));assert.equal(a.record(),before);assert.equal((await a.host.inspect()).backup_verified,false);
 }finally{a.core.free();b.core.free();}
});
test('embedded artifact pins and page policy prohibit external scripts, form submission and signing facade',async()=>{
 const root=new URL('../',import.meta.url),pins=JSON.parse(await readFile(new URL('wallet-sdk/SOURCE.json',root),'utf8'));
 for(const file of pins.artifacts){assert.equal(createHash('sha256').update(await readFile(new URL('wallet-sdk/'+file.name,root))).digest('hex'),file.sha256);}
 const page=await readFile(new URL('wallet.html',root),'utf8'),worker=await readFile(new URL('src/embedded-wallet-worker.ts',root),'utf8');
 assert.match(page,/form-action 'none'/);assert.match(page,/worker-src 'self'/);assert.doesNotMatch(worker,/case '(sign|trust|membership|presentCredential)'/);
});
