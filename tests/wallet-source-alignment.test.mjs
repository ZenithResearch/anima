import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initSync,wallet_core_version} from '../wallet-sdk/castalia_wallet_core.js';
test('embedded core, presentation helper and companion use one public Wallet revision',async()=>{
 const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
 const core=await read('wallet-sdk/SOURCE.json'),presentation=await read('WALLET-SOURCE.json'),matrix=await read('MATRIX-COMPANION-SOURCE.json');
 assert.equal(core.repository,'https://github.com/ZenithResearch/castalia-wallet');
 assert.equal(core.revision,presentation.wallet.commit);assert.equal(core.revision,matrix.revision);
 initSync({module:await readFile(new URL('../wallet-sdk/castalia_wallet_core_bg.wasm',import.meta.url))});
 assert.equal(wallet_core_version(),core.core_version);assert.equal(core.core_version,'0.2.0');
});
