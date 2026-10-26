import test from 'node:test';
import assert from 'node:assert/strict';
import {renderWalletImportReview} from '../runtime/wallet-import-review.js';

const preview={publicKey:'a'.repeat(64),restoring:true,chainAccounts:[
 {accountId:'cardano',networkId:'cardano:mainnet',address:'addr1_public_fixture'},
 {accountId:'ethereum',networkId:'eip155:1',address:'0x1111111111111111111111111111111111111111'},
 {accountId:'robinhood',networkId:'eip155:4663',address:'0x1111111111111111111111111111111111111111'},
 {accountId:'solana',networkId:'solana:mainnet-beta',address:'PublicFixtureAddress'}
]};
test('recovery review groups the public key and four derived accounts, with one confirmation',()=>{
 const html=renderWalletImportReview(preview);
 assert.match(html,/<h2[^>]*>Review your wallet<\/h2>/);
 assert.match(html,/<h3>Wallet recovery<\/h3>/);
 assert.match(html,/<summary>Wallet public key<\/summary>/);
 assert.match(html,/<summary>Derived blockchain accounts \(4\)<\/summary>/);
 for(const record of preview.chainAccounts)assert.ok(html.includes(record.networkId)&&html.includes(record.address));
 assert.equal((html.match(/data-action="confirm"/g)||[]).length,1);
 assert.doesNotMatch(html,/<(?:summary|h[1-6])>[^<]*(?:Wallet identities|Saved account identities)/);
 assert.match(html,/backed up separately in Castaway data/);
 assert.match(html,/Transaction signing is not available here/);
});
test('public display fields are escaped rather than becoming executable markup',()=>{
 const html=renderWalletImportReview({...preview,publicKey:'<script>key</script>',chainAccounts:[{accountId:'test',networkId:'<img src=x onerror=alert(1)>',address:'<script>address</script>'}]});
 assert.doesNotMatch(html,/<script>|<img/);
 assert.match(html,/&lt;script&gt;key/);
 assert.match(html,/&lt;script&gt;address/);
});
test('an older cached preview remains readable without inventing an empty accounts section',()=>{
 const html=renderWalletImportReview({publicKey:preview.publicKey,restoring:true});
 assert.match(html,/Wallet public key/);
 assert.doesNotMatch(html,/Derived blockchain accounts \(0\)/);
 assert.match(html,/Reload this review to see the derived blockchain accounts/);
});
test('new-wallet review does not claim a recovery file was checked',()=>{
 const html=renderWalletImportReview({...preview,restoring:false});
 assert.match(html,/<h3>New Wallet<\/h3>/);
 assert.doesNotMatch(html,/Recovery file checked/);
 assert.match(html,/>Save Wallet<\/button>/);
});
