import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoStore} from '../runtime/workspace-demo-store.js';
import {emptyState} from '../workspace/domain.mjs';

test('walkthrough saves are isolated, cloned snapshots and vanish with their adapter',async()=>{
 const first=createDemoStore(),second=createDemoStore(),state=emptyState();
 state.world={invitationDrafts:[{email:'director@example.com'}]};
 await first.save('demo',state);state.world.invitationDrafts[0].email='changed@example.com';
 assert.equal((await first.load('demo')).world.invitationDrafts[0].email,'director@example.com');
 const read=await first.load('demo');read.brand.name='Changed read';
 assert.equal((await first.load('demo')).brand.name,'');
 assert.equal(await second.load('demo'),undefined);
});

test('demo originals and removals stay within their own instance',async()=>{
 const first=createDemoStore(),second=createDemoStore();
 const file=new File(['example'],'example.txt',{type:'text/plain'});
 await first.save('demo',emptyState(),[['file-1',file]]);
 assert.equal(await (await first.file('file-1')).text(),'example');
 assert.equal(await second.file('file-1'),undefined);
 await first.save('demo',emptyState(),[],['file-1']);
 assert.equal(await first.file('file-1'),undefined);
});
