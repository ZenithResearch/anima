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
test('embedded artifact pins and page policy prohibit external scripts, form submission and generic signing or page-selected trust',async()=>{
 const root=new URL('../',import.meta.url),pins=JSON.parse(await readFile(new URL('wallet-sdk/SOURCE.json',root),'utf8'));
 for(const file of pins.artifacts){assert.equal(createHash('sha256').update(await readFile(new URL('wallet-sdk/'+file.name,root))).digest('hex'),file.sha256);}
 const page=await readFile(new URL('wallet.html',root),'utf8'),worker=await readFile(new URL('src/embedded-wallet-worker.ts',root),'utf8');
 assert.match(page,/form-action 'none'/);assert.match(page,/worker-src 'self'/);assert.doesNotMatch(worker,/case '(sign|trust|membership|presentCredential)'/);assert.match(worker,/embeddedPresentationTrust\(self.location.origin\)/);assert.match(worker,/embeddedMembershipTrust\(\)/);
});

test('same embedded host persists verified membership and signs only under explicit receiver policy and consent',async()=>{
 const {generateKeyPairSync,sign}=await import('node:crypto');
 const {canonicalPresentationJson}=await import('../runtime/vendor/wallet-credential-presentation.js');
 const f=fixture();try{
  await f.host.initialize();const p=await f.host.previewCreate(password);await f.host.confirm();
  await assert.rejects(f.host.presentationIdentity());
  const backup=await f.host.exportRecovery(backupPassword);await f.host.verifyBackup(backup.file,backupPassword);
  await assert.rejects(f.host.presentationIdentity());
  const issuer=generateKeyPairSync('ed25519'),publicKey=issuer.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex');
  const owner=Buffer.from(p.publicKey,'hex'),digest=b=>createHash('sha256').update(b).digest('hex');
  const trust={v3:{schema:'castalia.zenith-membership-trust-policy.v1',version:1,roots:[{issuerId:'fixture-issuer',keyId:'fixture-key',signatureSuite:'Ed25519',publicKey}]}};
  await f.host.approveMembershipTrust(trust);const join=await f.host.membershipRequest();assert.equal(join.ownerPublicKey,p.publicKey);
  const membershipId=digest(Buffer.concat([Buffer.from('castalia/zenith-membership-id/v3\0'),owner]));
  const version=Buffer.alloc(8);version.writeBigUInt64LE(3n);const strings=['active','fixture-issuer','fixture-key','ed25519'].flatMap(text=>{const n=Buffer.alloc(4);n.writeUInt32LE(text.length);return [n,Buffer.from(text)];});
  const transcript=Buffer.concat([Buffer.from('castalia/zenith-membership-credential/v3\0'),version,Buffer.from(membershipId,'hex'),owner,...strings]);
  const proof={schema:'castalia.zenith-membership-credential.v3',version:3,membershipId,ownerPublicKey:p.publicKey,status:'active',issuerId:'fixture-issuer',issuerKeyId:'fixture-key',signatureSuite:'Ed25519',issuerSignature:sign(null,transcript,issuer.privateKey).toString('base64url')};
  assert.equal((await f.host.activateMembership(proof)).membership_active,true);
  assert.deepEqual((await f.host.presentationIdentity()).membership,proof);
  const caller={kind:'browser',id:'http://127.0.0.1:4337'},now=Math.floor(Date.now()/1000),disclosure={title:'Disposable request',statements:['Only in-memory fixture material.']};
  const claims={schema:'castalia.request-credential.v1',issuer:'fixture-issuer',key_id:'fixture-key',holder_public_key:p.publicKey,audience:'fixture-service',caller,request_digest_sha256:digest('opaque request'),disclosure_digest_sha256:digest(canonicalPresentationJson(disclosure)),policy_digest_sha256:'ab'.repeat(32),nonce:'01'.repeat(16),issued_at:now,expires_at:now+120};
  const credential={claims,signature:sign(null,Buffer.concat([Buffer.from('castalia.request-credential.v1/signature\0'),Buffer.from(canonicalPresentationJson(claims))]),issuer.privateKey).toString('hex')};
  const request={schema:'castalia.credential-presentation-request.v2',request_bytes_base64:Buffer.from('opaque request').toString('base64'),disclosure,credential};
  await assert.rejects(f.host.prepareCredentialPresentation(request));
  await f.host.approvePresentationTrust({schema:'castalia.wallet-presentation-trust.v1',caller,pins:[{issuer:'fixture-issuer',key_id:'fixture-key',public_key:publicKey,audience:'fixture-service',callers:[caller]}]});
  const preview=await f.host.prepareCredentialPresentation(request),before=f.record();assert.equal(preview.summary.holder_public_key,p.publicKey);
  const presentation=await f.host.approveCredentialPresentation(preview.token);assert.equal(presentation.holder_public_key,p.publicKey);assert.equal(f.record(),before);assert.match(presentation.signature,/^[0-9a-f]{128}$/);
  await assert.rejects(f.host.approveCredentialPresentation(preview.token));
  const stale=await f.host.prepareCredentialPresentation(request);f.set('changed encrypted record');await assert.rejects(f.host.approveCredentialPresentation(stale.token),/another tab/);assert.equal(f.record(),'changed encrypted record');
 }finally{f.core.free();}
});
