import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createFixtureMatrixReadClient} from '../runtime/vendor/matrix-companion.js';
import {readMatrixCompanion,matrixRoomsInSpace,matrixApprovalView} from '../runtime/matrix-companion-read.js';
import {createConnectionsFixture} from '../runtime/connections-fixture-model.js';
import {connectionsFixtureView} from '../runtime/connections-fixture-view.js';
const load=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const example=await load('../provider-contract/matrix-companion-v1.fixture.json');
const request=await load('../provider-contract/intake-request.fixture.json');
const fixture=()=>{let n=0;return createFixtureMatrixReadClient({now:()=>1800000000000,randomId:()=>`read-fixture-${++n}`});};
const status=(connections=[example.connect.result])=>({schema:'castalia.matrix-status.v1',state:connections.length?'connected':'disconnected',connections});
const readClient=overrides=>({getCapabilities:async()=>['matrix_companion_v1'],getStatus:async()=>status(),listRooms:async()=>structuredClone(example.rooms.result),...overrides});

test('Matrix source pins reconstruct upstream exactly and fixture bytes match provenance',async()=>{
 const manifest=await load('../MATRIX-COMPANION-SOURCE.json');assert.equal(manifest.version,'0.2.0');assert.equal(manifest.revision,'19ec02f0000f7c59f7341f87ad4c04fd54784fe1');
 for(const file of manifest.files){const bytes=await readFile(new URL('../'+file.local,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}
 const patched=await readFile(new URL('../src/vendor/matrix-companion.ts',import.meta.url),'utf8');assert.ok(patched.startsWith(manifest.patch.attributionHeader));
 const count=0;const original=patched.slice(manifest.patch.attributionHeader.length);
 assert.equal(count,manifest.patch.nonNullAssertions);assert.equal(createHash('sha256').update(original).digest('hex'),manifest.source.sha256);
});

test('producer read fixture exposes only safe reads, never approvals, sending or stored secrets',async()=>{
 const client=await fixture();assert.deepEqual(Object.keys(client).sort(),['getCapabilities','getStatus','listRooms']);
 const view=await readMatrixCompanion(client);assert.equal(view.connections[0].user_id,example.connect.result.user_id);assert.deepEqual(view.rooms,example.rooms.result.rooms);
 assert.doesNotMatch(JSON.stringify(view),/access_token|device_key|recovery|fixture-access-token-private|sealed_state/);
 const source=await readFile(new URL('../src/connections-fixture.ts',import.meta.url),'utf8');assert.doesNotMatch(source,/\.approvals|createMatrixCompanion\(|createFixtureMatrixTransport|createMemoryProtectedStore|prepareSend\(/);
});

test('reader fails closed on unexpected status/room fields, absent capabilities and cursor loops',async()=>{
 await assert.rejects(readMatrixCompanion(readClient({getStatus:async()=>({...status(),access_token:'leak'})})),/shape/);
 const bad=structuredClone(example.rooms.result);bad.rooms[0].access_token='leak';await assert.rejects(readMatrixCompanion(readClient({listRooms:async()=>bad})),/shape/);
 await assert.rejects(readMatrixCompanion(readClient({getCapabilities:async()=>[]})),/unavailable/);
 await assert.rejects(readMatrixCompanion(readClient({listRooms:async()=>({...example.rooms.result,next_cursor:'opaque-repeated-page'})})),/repeated/);
 await assert.rejects(readMatrixCompanion(readClient({getStatus:async()=>({...status(),state:'disconnected'})})),/Inconsistent/);
});

test('room pagination preserves opaque cursors and account selection never combines contexts',async()=>{
 const calls=[];let n=0;const client=readClient({listRooms:async q=>{calls.push(q);return {schema:'castalia.matrix-room-page.v1',rooms:[example.rooms.result.rooms[n++]],next_cursor:n===1?'opaque-next':null};}});
 const view=await readMatrixCompanion(client);assert.equal(view.rooms.length,2);assert.equal(calls[0].cursor,null);assert.equal(calls[1].cursor,'opaque-next');assert.equal(calls[1].connection_handle,example.connect.result.connection_handle);
 const second={...example.connect.result,connection_handle:'another-account',user_id:'@other:example'};let lists=0;const many=readClient({getStatus:async()=>status([example.connect.result,second]),listRooms:async q=>{lists++;assert.equal(q.connection_handle,'another-account');return example.rooms.result;}});
 const unselected=await readMatrixCompanion(many);assert.equal(unselected.selectedConnection,null);assert.deepEqual(unselected.rooms,[]);assert.equal(lists,0);
 assert.equal((await readMatrixCompanion(many,'another-account')).selectedConnection,'another-account');await assert.rejects(readMatrixCompanion(many,'stale-handle'),/available/);
 const empty=await readMatrixCompanion(readClient({getStatus:async()=>status([]),listRooms:async()=>assert.fail('must not list without account')}));assert.equal(empty.state,'disconnected');assert.deepEqual(empty.rooms,[]);
});

test('Anima display scope uses explicit Space parents, never names or aliases as authority',()=>{
 const rooms=structuredClone(example.rooms.result.rooms),space=rooms.find(r=>r.kind==='space'),child=rooms.find(r=>r.kind==='room');space.name='Renamed';child.name='Anything';
 const fake={...child,room_id:'!unrelated:example',name:'Anima Requests',canonical_alias:'#anima:example',parent_space_ids:[]};
 assert.deepEqual(matrixRoomsInSpace([...rooms,fake],space.room_id).map(r=>r.room_id),[child.room_id]);assert.deepEqual(matrixRoomsInSpace([child,fake],space.room_id),[]);
 const selected=matrixRoomsInSpace(rooms,space.room_id);selected[0].parent_space_ids.length=0;assert.equal(child.parent_space_ids.length,1);
});

test('approval-result mapping preserves pending/denied/expired and unknown delivery without service claims',()=>{
 const schema='castalia.matrix-approval-status.v1';for(const state of ['pending','denied','expired'])assert.deepEqual(matrixApprovalView({schema,state,result:null}),{state,connection:null,delivery:null});
 assert.equal(matrixApprovalView({schema,state:'approved',result:example.connect.result}).connection.connection_handle,example.connect.result.connection_handle);
 for(const state of ['unknown','sent','failed']){const view=matrixApprovalView({schema,state:'approved',result:{...example.send.result,state,event_id:state==='unknown'?null:example.send.result.event_id}});assert.equal(view.delivery.state,state);assert.equal(view.connection,null);assert.equal('service_request' in view,false);assert.equal('case' in view,false);}
 assert.throws(()=>matrixApprovalView({schema,state:'pending',result:example.connect.result}),/Unexpected/);assert.throws(()=>matrixApprovalView({schema,state:'approved',result:null}),/Missing/);
 assert.throws(()=>matrixApprovalView({schema,state:'approved',result:{...example.connect.result,access_token:'leak'}}),/shape/);
});

test('shared Matrix projection stays independent of membership examples and preserves the service brief',async()=>{
 const shared=await readMatrixCompanion(await fixture()),client=createConnectionsFixture(request,shared),original=structuredClone(request);
 for(const scenario of ['new-member','enrollment-pending','org-denied']){await client.scenario(scenario);const view=await client.read();assert.deepEqual(view.sharedMatrix,shared);assert.deepEqual(view.request,original);assert.ok(Object.values(view.realActions).every(value=>value===false));}
 const s=await client.read();s.sharedMatrix.rooms[0].name='<img src=x onerror=bad()>';const html=connectionsFixtureView(s);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);assert.match(html,/read-only producer fixture/);assert.match(html,/0\.2\.0/);assert.match(html,/never room names/);assert.match(html,/Live authentication/);assert.match(html,/disabled aria-describedby="send-disabled"/);
 assert.deepEqual((await client.read()).sharedMatrix,shared);assert.deepEqual(request,original);
});
