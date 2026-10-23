import {test} from 'node:test';
import assert from 'node:assert/strict';
import {embeddedServiceWallet} from '../runtime/embedded-service-wallet.js';
import {embeddedPresentationTrust,embeddedMembershipTrust,requireEmbeddedOrigin} from '../runtime/embedded-wallet-profile.js';
function fixture(review){const calls=[];let fail=false;const preview={token:'one-shot',summary:{disclosure:{title:'Verified request',statements:['Exact request']},confirm_by:Date.now()/1000+60}};const client={state:async()=>({unlocked:true,backup_eligible:true,membership_active:true,public_key:'public'}),connectionIdentity:async()=>({membership:{membershipId:'verified'}}),preparePresentation:async r=>{calls.push(['prepare',r]);return preview;},approvePresentation:async t=>{calls.push(['approve',t]);if(fail)throw Error('stale');return {signature:'opaque-reviewed-result'};},cancelPresentation:async()=>{calls.push(['cancel']);}};return {calls,preview,client,fail:()=>{fail=true;},wallet:embeddedServiceWallet(client,review)};}
test('embedded Service facade requires explicit verified preview approval and does not consult a global or extension',async()=>{
 const a=fixture(async()=>false);assert.equal((await a.wallet.presentCredential({})).state,'denied');assert.deepEqual(a.calls.map(x=>x[0]),['prepare','cancel']);
 let observed;const b=fixture(async p=>{observed=p;return true;});const request={schema:'opaque'};
 assert.equal((await b.wallet.presentCredential(request)).state,'approved');assert.equal(observed,b.preview);assert.deepEqual(b.calls,[['prepare',request],['approve','one-shot']]);
 assert.equal((await b.wallet.getMembership()).membershipId,'verified');b.fail();assert.equal((await b.wallet.presentCredential(request)).state,'unavailable');assert.equal(b.calls.at(-1)[0],'cancel');
});
test('only one consent can be open and cancellation does not sign the queued request',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>{finish=resolve;}));const first=f.wallet.presentCredential({});
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal((await f.wallet.presentCredential({})).state,'unavailable');finish(false);assert.equal((await first).state,'denied');assert.equal(f.calls.filter(x=>x[0]==='approve').length,0);
});
test('a ready local identity is not membership and policy accepts only the reviewed exact origin',async()=>{
 const f=fixture(async()=>true);for(const state of [{unlocked:false},{unlocked:true,backup_eligible:false},{unlocked:true,backup_eligible:true,membership_active:false}]){f.client.state=async()=>state;assert.equal((await f.wallet.getStatus()).state,'locked');}
 for(const origin of ['http://127.0.0.1:4340','http://localhost:4337','https://unreviewed.example'])assert.throws(()=>requireEmbeddedOrigin(origin));
 const policy=embeddedPresentationTrust('http://127.0.0.1:4337');assert.equal(policy.schema,'castalia.wallet-presentation-trust.v1');assert.equal(policy.pins[0].callers[0].id,policy.caller.id);assert.equal(embeddedMembershipTrust().v3.roots[0].issuerId,'zenith-research');
});
