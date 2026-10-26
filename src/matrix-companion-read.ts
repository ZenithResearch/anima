import type {MatrixCompanion,MatrixCompanionReadClient,MatrixApprovalStatus,MatrixConnectionSummary,MatrixRoomSummary,MatrixDelivery} from './vendor/matrix-companion.js';
// Presentation adapter over producer-owned types. This is not a Wallet host,
// transport, custody implementation, live integration or authority projection.
export type MatrixReadClient=MatrixCompanionReadClient;
export interface MatrixReadView {
 capability:'matrix_companion_v1';state:'connected'|'disconnected';
 connections:MatrixConnectionSummary[];selectedConnection:string|null;rooms:MatrixRoomSummary[];
}
function exact(value:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))throw Error('Invalid Matrix public fixture shape.');
 return value as Record<string,unknown>;
}
function text(value:unknown,max=4096):string{
 if(typeof value!=='string'||!value.length||value.length>max||/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(value))throw Error('Invalid Matrix public fixture text.');return value;
}
function identifier(value:unknown):string{const s=text(value,200);if(!/^[a-zA-Z0-9._:-]+$/.test(s))throw Error('Invalid Matrix public handle.');return s;}
function connection(value:unknown):MatrixConnectionSummary{
 const v=exact(value,['schema','connection_handle','homeserver','user_id']);if(v.schema!=='castalia.matrix-connection.v1')throw Error('Unsupported Matrix connection version.');
 const homeserver=text(v.homeserver,300),url=new URL(homeserver),user=text(v.user_id,255);
 if(url.protocol!=='https:'||url.origin!==homeserver||url.username||url.password||!/^@[A-Za-z0-9._=\-/]+:[A-Za-z0-9.-]+$/.test(user))throw Error('Invalid Matrix public account.');
 return {schema:'castalia.matrix-connection.v1',connection_handle:identifier(v.connection_handle),homeserver,user_id:user};
}
function room(value:unknown):MatrixRoomSummary{
 const v=exact(value,['room_id','kind','name','canonical_alias','topic','avatar_url','parent_space_ids']),id=text(v.room_id,255);
 if(!id.startsWith('!')||(v.kind!=='room'&&v.kind!=='space'))throw Error('Invalid Matrix public room.');
 const nullable=(x:unknown,max:number)=>x===null?null:text(x,max),alias=nullable(v.canonical_alias,255),avatar=nullable(v.avatar_url,2048);
 if(alias!==null&&!alias.startsWith('#')||avatar!==null&&!/^mxc:\/\/[A-Za-z0-9.-]+\/[A-Za-z0-9_-]+$/.test(avatar))throw Error('Invalid Matrix public metadata.');
 if(!Array.isArray(v.parent_space_ids)||v.parent_space_ids.some(x=>typeof x!=='string'||!x.startsWith('!')||x.length>255))throw Error('Invalid Matrix Space parents.');
 return {room_id:id,kind:v.kind,name:nullable(v.name,255),canonical_alias:alias,topic:nullable(v.topic,4096),avatar_url:avatar,parent_space_ids:v.parent_space_ids.map(x=>text(x,255))};
}
function delivery(value:unknown):MatrixDelivery{
 const v=exact(value,['schema','delivery_handle','transaction_id','state','event_id']);
 if(v.schema!=='castalia.matrix-delivery.v1'||!['sent','unknown','failed'].includes(v.state as string))throw Error('Unsupported Matrix delivery example.');
 const event=v.event_id===null?null:text(v.event_id,255);if(event!==null&&!event.startsWith('$'))throw Error('Invalid Matrix event example.');
 return {schema:'castalia.matrix-delivery.v1',delivery_handle:identifier(v.delivery_handle),transaction_id:identifier(v.transaction_id),state:v.state as MatrixDelivery['state'],event_id:event};
}
// This reader uses only application-facing read methods. Production discovery
// and connection policy are deliberately not connected from the fixture page.
export async function readMatrixCompanion(client:MatrixReadClient,selectedHandle?:string):Promise<MatrixReadView>{
 if(!(await client.getCapabilities()).includes('matrix_companion_v1'))throw Error('Matrix companion v1 is unavailable.');
 const status=exact(await client.getStatus(),['schema','state','connections']);
 if(status.schema!=='castalia.matrix-status.v1'||!['connected','disconnected'].includes(status.state as string)||!Array.isArray(status.connections))throw Error('Invalid Matrix public status.');
 const connections=status.connections.map(connection),rooms:MatrixRoomSummary[]=[];
 if((status.state==='connected')!==(connections.length>0))throw Error('Inconsistent Matrix public status.');
 const selected=selectedHandle===undefined?(connections.length===1?connections[0]:undefined):connections.find(c=>c.connection_handle===selectedHandle);
 if(selectedHandle!==undefined&&!selected)throw Error('Choose an available Matrix account.');
 for(const c of selected?[selected]:[]){
  let cursor:string|null=null;const seen=new Set<string>();let pages=0;
  do{
   if(++pages>100)throw Error('Matrix room listing is incomplete.');
   const page=exact(await client.listRooms({schema:'castalia.matrix-list-rooms-request.v1',connection_handle:c.connection_handle,limit:100,cursor}),['schema','rooms','next_cursor']);
   if(page.schema!=='castalia.matrix-room-page.v1'||!Array.isArray(page.rooms))throw Error('Invalid Matrix public room page.');
   rooms.push(...page.rooms.map(room));cursor=page.next_cursor===null?null:identifier(page.next_cursor);
   if(cursor!==null){if(seen.has(cursor))throw Error('Matrix room cursor repeated.');seen.add(cursor);}
  }while(cursor!==null);
 }
 // No room is declared relevant to Anima from a name, alias or mere listing.
 return {capability:'matrix_companion_v1',state:status.state as MatrixReadView['state'],connections,selectedConnection:selected?.connection_handle??null,rooms};
}

// Direct Space membership only; metadata is display scope, never provider authority.
export function matrixRoomsInSpace(rooms:readonly MatrixRoomSummary[],spaceId:string):MatrixRoomSummary[]{
 if(!rooms.some(r=>r.kind==='space'&&r.room_id===spaceId))return [];
 return rooms.filter(r=>r.kind==='room'&&r.parent_space_ids.includes(spaceId)).map(r=>structuredClone(r));
}
export interface MatrixApprovalView {state:MatrixApprovalStatus['state'];connection:MatrixConnectionSummary|null;delivery:MatrixDelivery|null;}
export function matrixApprovalView(value:Awaited<ReturnType<MatrixCompanion['getApprovalStatus']>>):MatrixApprovalView{
 const v=exact(value,['schema','state','result']);
 if(v.schema!=='castalia.matrix-approval-status.v1'||!['pending','approved','denied','expired'].includes(v.state as string))throw Error('Invalid Matrix approval projection.');
 if(v.state!=='approved'){if(v.result!==null)throw Error('Unexpected Matrix approval result.');return {state:v.state as MatrixApprovalStatus['state'],connection:null,delivery:null};}
 const result=v.result as {schema?:unknown}|null;
 if(result?.schema==='castalia.matrix-connection.v1')return {state:'approved',connection:connection(result),delivery:null};
 if(result?.schema==='castalia.matrix-delivery.v1')return {state:'approved',connection:null,delivery:delivery(result)};
 throw Error('Missing Matrix approval result.');
}
