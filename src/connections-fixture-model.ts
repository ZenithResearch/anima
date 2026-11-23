import type {MatrixReadView} from './matrix-companion-read.js';
import type {IntakeRequest,TransportReceipt} from './vendor/service-client.js';
// Provisional, in-tab presentation models only. These are NOT shared contracts,
// custody records, membership credentials or authoritative provider projections.
export const connectionScenarios=[
 ['connected','Connected example'],['new-member','New member'],['locked','Wallet locked'],
 ['enrollment-pending','Enrollment pending'],['org-denied','Organization access denied'],
 ['connecting','Matrix connecting'],['syncing','Matrix syncing'],['offline','Matrix offline'],
 ['error','Matrix error'],['no-rooms','No conversations'],
 ['matrix-acknowledged','Matrix acknowledged · provider pending'],
 ['queue-offered','Queue fallback offered'],['unknown','Unknown outcome · reconcile']
] as const;
export type ConnectionScenario=typeof connectionScenarios[number][0];
export type OperatingProfile='requesting'|'provider'|'hybrid';
export type ProviderDescriptor='studio'|'agency'|'consultant';
export type MatrixViewState='unconfigured'|'locked'|'auth-required'|'connecting'|'syncing'|'online'|'offline'|'error';
export interface ExampleMessage {id:string;author:string;at:string;body:string;attachment?:{name:string;bytes:number};}
export interface ExampleRoom {id:string;name:string;messages:ExampleMessage[];}
export interface DraftMessagePreview {body:string;attachment:{name:string;bytes:number}|null;roomId:string;}
export interface ConnectionsViewSnapshot {
 mode:'fixture';scenario:ConnectionScenario;sharedMatrix:MatrixReadView|null;
 member:{identity:'absent'|'locked'|'available';membership:'none'|'pending'|'verified';label:string};
 organization:{selected:string|null;access:'unavailable'|'authorized'|'denied';profile:OperatingProfile;descriptor:ProviderDescriptor};
 organizations:{id:string;name:string}[];missing:string[];
 matrix:{state:MatrixViewState;accountLabel:string|null;homeserverLabel:string|null;syncLabel:string;rooms:ExampleRoom[];selectedRoom:string|null};
 route:{primary:'matrix';fallback:'queue';selected:'matrix'|'queue'|null;acknowledgement:'none'|'acknowledged'|'unknown';provider:'not-submitted'|'pending';fallbackOffered:boolean;reconciliationRequired:boolean;receipt:TransportReceipt|null};
 request:IntakeRequest;draft:DraftMessagePreview|null;
 realActions:{accountCreation:false;wallet:false;matrixSend:false;queueFallback:false;serviceSubmission:false};
}
export interface ConnectionsPreviewClient {
 readonly mode:'fixture';
 read():Promise<ConnectionsViewSnapshot>;
 scenario(value:ConnectionScenario):Promise<void>;
 organization(id:string|null):Promise<void>;
 profile(value:OperatingProfile):Promise<void>;
 descriptor(value:ProviderDescriptor):Promise<void>;
 room(id:string):Promise<void>;
 previewMessage(body:string,attachment:boolean):Promise<void>;
 reset():Promise<void>;
}
const organizations=[{id:'example-field-notes',name:'North Shore Field Notes'},{id:'example-studio',name:'Example independent studio'}];
const rooms:ExampleRoom[]=[
 {id:'example-brief-room',name:'Brand conversation',messages:[
  {id:'example-event-1',author:'Example teammate',at:'10:20',body:'Let’s keep the brief and references together.'},
  {id:'example-event-2',author:'Example provider',at:'10:22',body:'A message acknowledgement and service acceptance will be shown separately.'},
  {id:'example-event-3',author:'Example teammate',at:'10:24',body:'A reference for the conversation.',attachment:{name:'example-reference.txt',bytes:384}}
 ]},
 {id:'example-studio-room',name:'Studio collaborators',messages:[{id:'example-event-4',author:'Example collaborator',at:'09:45',body:'What would you like to work on together?'}]}
];
const matrixState:Partial<Record<ConnectionScenario,MatrixViewState>>={
 'new-member':'unconfigured',locked:'locked','enrollment-pending':'auth-required',connecting:'connecting',syncing:'syncing',offline:'offline',error:'error','queue-offered':'offline',unknown:'offline'
};
export function createConnectionsFixture(request:IntakeRequest,sharedMatrix:MatrixReadView|null=null):ConnectionsPreviewClient{
 const original=structuredClone(request);let selectedScenario:ConnectionScenario='connected',selectedOrganization:string|null=organizations[0]!.id,selectedProfile:OperatingProfile='hybrid',selectedDescriptor:ProviderDescriptor='studio',selectedRoom:string|null=rooms[0]!.id,draft:DraftMessagePreview|null=null;
 function snapshot():ConnectionsViewSnapshot{
  const s=selectedScenario,newMember=s==='new-member',pending=s==='enrollment-pending',locked=s==='locked',denied=s==='org-denied',empty=s==='no-rooms'||newMember||pending;
  const state=matrixState[s]??'online',ack=s==='matrix-acknowledged',unknown=s==='unknown',fallback=s==='queue-offered',organization=newMember||pending?null:selectedOrganization;
  const missing=newMember?['Connect a member account.']:pending?['Enrollment is awaiting confirmation.']:locked?['Unlock through the supported Wallet connection.']:denied?['Organization access has not been granted.']:!organization?['Choose an organization.']:[];
  if(state==='unconfigured')missing.push('Add Matrix through the supported Wallet connection.');
  return {
   mode:'fixture',scenario:s,sharedMatrix:structuredClone(sharedMatrix),member:{identity:newMember?'absent':locked?'locked':'available',membership:newMember?'none':pending?'pending':'verified',label:newMember?'No member account':'Example member'},
   organization:{selected:organization,access:denied?'denied':organization&&!locked?'authorized':'unavailable',profile:selectedProfile,descriptor:selectedDescriptor},organizations:structuredClone(organizations),missing,
   matrix:{state,accountLabel:newMember||pending?null:'@example-member:example.invalid',homeserverLabel:newMember||pending?null:'example.invalid',syncLabel:state==='online'?'Example sync is current':state==='syncing'?'Example sync in progress':state==='offline'?'Cached example · not syncing':state==='error'?'Example sync failed':'No active example sync',rooms:empty?[]:structuredClone(rooms),selectedRoom:empty?null:selectedRoom},
   route:{primary:'matrix',fallback:'queue',selected:ack||unknown?'matrix':null,acknowledgement:ack?'acknowledged':unknown?'unknown':'none',provider:ack?'pending':'not-submitted',fallbackOffered:fallback,reconciliationRequired:unknown,receipt:ack?{transport:'matrix',receipt_id:'example-matrix-ack-01',recorded_at:'2026-10-23T17:24:00Z',expires_at:null}:null},
   request:structuredClone(original),draft:structuredClone(draft),realActions:{accountCreation:false,wallet:false,matrixSend:false,queueFallback:false,serviceSubmission:false}
  };
 }
 return {
  mode:'fixture',read:async()=>snapshot(),
  async scenario(value){if(!connectionScenarios.some(([id])=>id===value))throw Error('Choose an example state.');selectedScenario=value;draft=null;},
  async organization(id){if(id!==null&&!organizations.some(o=>o.id===id))throw Error('Unknown example organization.');selectedOrganization=id;draft=null;},
  async profile(value){if(!['requesting','provider','hybrid'].includes(value))throw Error('Unknown operating profile.');selectedProfile=value;},
  async descriptor(value){if(!['studio','agency','consultant'].includes(value))throw Error('Unknown provider description.');selectedDescriptor=value;},
  async room(id){if(!snapshot().matrix.rooms.some(r=>r.id===id))throw Error('Choose an available example conversation.');selectedRoom=id;draft=null;},
  async previewMessage(body,attachment){const room=snapshot().matrix.selectedRoom,trimmed=body.trim();if(!room)throw Error('Choose a conversation first.');if(!trimmed||trimmed.length>2000)throw Error('Add a message of up to 2,000 characters.');draft={roomId:room,body:trimmed,attachment:attachment?{name:'example-reference.txt',bytes:384}:null};},
  async reset(){selectedScenario='connected';selectedOrganization=organizations[0]!.id;selectedProfile='hybrid';selectedDescriptor='studio';selectedRoom=rooms[0]!.id;draft=null;}
 };
}
