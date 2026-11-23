import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createConnectionsFixture,connectionScenarios} from '../runtime/connections-fixture-model.js';
import {connectionsFixtureView} from '../runtime/connections-fixture-view.js';
const request=JSON.parse(await readFile(new URL('../provider-contract/intake-request.fixture.json',import.meta.url),'utf8'));
test('every connection fixture leaves actual account, Wallet and delivery operations disabled',async()=>{
 const client=createConnectionsFixture(request);for(const [scenario]of connectionScenarios){await client.scenario(scenario);const s=await client.read();assert.equal(s.mode,'fixture');assert.ok(Object.values(s.realActions).every(v=>v===false));assert.equal(typeof client.send,'undefined');assert.equal(typeof client.unlock,'undefined');}
});
test('fixture selections and message previews cannot mutate canonical request identity or imply a send',async()=>{
 const before=structuredClone(request),client=createConnectionsFixture(request);await client.profile('provider');await client.descriptor('agency');await client.organization('example-studio');await client.previewMessage('A local draft.',true);
 const first=await client.read();assert.deepEqual(first.request,before);assert.equal(first.organization.descriptor,'agency');assert.equal(first.draft.body,'A local draft.');assert.equal(first.route.acknowledgement,'none');assert.equal(first.matrix.rooms[0].messages.length,3);
 first.request.request_id='changed';first.matrix.rooms[0].messages.push({body:'changed'});assert.deepEqual((await client.read()).request,before);assert.equal((await client.read()).matrix.rooms[0].messages.length,3);assert.deepEqual(request,before);
 await client.room('example-studio-room');assert.equal((await client.read()).draft,null);await assert.rejects(client.room('foreign-room'));await assert.rejects(client.organization('foreign-org'));
});
test('Matrix acknowledgement stays provider-pending and unknown delivery never silently becomes Queue fallback',async()=>{
 const c=createConnectionsFixture(request);await c.scenario('matrix-acknowledged');let s=await c.read();assert.equal(s.route.receipt.transport,'matrix');assert.equal(s.route.provider,'pending');assert.equal(s.route.fallbackOffered,false);
 await c.scenario('unknown');s=await c.read();assert.equal(s.route.reconciliationRequired,true);assert.equal(s.route.fallbackOffered,false);assert.equal(s.route.receipt,null);assert.equal(s.route.acknowledgement,'unknown');
 await c.profile('hybrid');await c.organization('example-studio');assert.equal((await c.read()).route.reconciliationRequired,true);
 await c.scenario('queue-offered');s=await c.read();assert.equal(s.route.fallbackOffered,true);assert.equal(s.route.selected,null);assert.equal(s.realActions.queueFallback,false);assert.deepEqual(s.request,request);
});
test('fixtures render escaped material, explicit pending states and natively disabled real actions',async()=>{
 const c=createConnectionsFixture(request);await c.previewMessage('<img src=x onerror=bad()>',true);let s=await c.read(),html=connectionsFixtureView(s);assert.ok(!html.includes('<img'));assert.match(html,/&lt;img/);assert.match(html,/Fixture only/);assert.match(html,/disabled aria-describedby="send-disabled"/);assert.match(html,/Draft preview · not sent/);
 await c.scenario('new-member');await assert.rejects(c.previewMessage('Example',false),/conversation/);s=await c.read();html=connectionsFixtureView(s);assert.match(html,/No conversations/);assert.equal(s.organization.access,'unavailable');assert.equal(s.member.membership,'none');
 await c.scenario('org-denied');assert.equal((await c.read()).organization.access,'denied');await c.profile('requesting');assert.equal((await c.read()).organization.access,'denied');
});
