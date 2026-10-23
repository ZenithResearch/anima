// Anima's portable handoff document. No service stages or generation commands.
export const BRIEF_SCHEMA='anima.brand-brief.v1';
export const BRIEF_SCHEMA_V2='anima.brand-brief.v2';
export const LIMITS=Object.freeze({files:24,each:10*1024*1024,total:25*1024*1024,references:64});
const ids=['logo','type','palette','spacing','layout','imagery','motion','voice'];
const answerIds=['feeling','people','world','signature','references'];
const answerIdsV2=[...answerIds,'brand','body','emotion'];
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v,n)=>typeof v==='string'&&v.length<=n&&!/[\u0000]/.test(v);
const key=v=>text(v,180)&&!!v.trim();
const url=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}};
const exact=(v,allowed)=>object(v)&&Object.keys(v).every(k=>allowed.includes(k));
export function validateBrief(packet){
 const v2=packet?.schema===BRIEF_SCHEMA_V2;
 if(!exact(packet,['schema','id','createdAt','brand','answers','foundations','references',...(v2?['peopleEntries']:[])])||![BRIEF_SCHEMA,BRIEF_SCHEMA_V2].includes(packet.schema)||!/^[0-9a-f-]{36}$/i.test(packet.id)||!Number.isFinite(Date.parse(packet.createdAt)))throw Error('Unsupported brief document.');
 if(!exact(packet.brand,['name','description','website'])||Object.values(packet.brand).some(v=>!text(v,4000))||(packet.brand.website&&!url(packet.brand.website)))throw Error('Invalid brand details.');
 if(!exact(packet.answers,v2?answerIdsV2:answerIds)||Object.entries(packet.answers).some(([id,value])=>!text(value,v2&&id==='people'?28200:4000))||(v2?['brand','emotion','people','world']:answerIds.slice(0,4)).some(id=>!packet.answers[id]?.trim()))throw Error('Complete the shared brand questions first.');
 if(v2&&packet.peopleEntries!==undefined){
  if(!Array.isArray(packet.peopleEntries)||!packet.peopleEntries.length||packet.peopleEntries.length>7||packet.peopleEntries.some(s=>!text(s,4000)||!s.trim()))throw Error('Use one to seven complete people descriptions.');
  const combined=packet.peopleEntries.length===1?packet.peopleEntries[0]:packet.peopleEntries.map((s,i)=>`${i+1}. ${s}`).join('\n\n');
  if(packet.answers.people!==combined)throw Error('People descriptions do not match the reviewed answer.');
 }

 if(!Array.isArray(packet.references)||packet.references.length>LIMITS.references)throw Error('Too many references.');
 const known=new Set();let total=0,count=0;
 for(const ref of packet.references){
  if(!exact(ref,['id','name','kind','url','type','size','sha256'])||!key(ref.id)||known.has(ref.id)||!text(ref.name,500)||!ref.name.trim())throw Error('Invalid reference.');known.add(ref.id);
  if(ref.kind==='link'){if(!url(ref.url)||ref.sha256!==undefined||ref.size!==undefined||ref.type!==undefined)throw Error('Invalid reference link.');}
  else if(ref.kind==='file'){
   if(ref.url!==undefined||!text(ref.type,200)||!Number.isSafeInteger(ref.size)||ref.size<0||ref.size>LIMITS.each||!/^[0-9a-f]{64}$/.test(ref.sha256))throw Error('Invalid file reference.');total+=ref.size;count++;
  }else throw Error('Unsupported reference type.');
 }
 if(total>LIMITS.total||count>LIMITS.files)throw Error('Keep files under 25 MB in total, 10 MB each, and 24 files.');
 if(!v2&&!packet.references.length&&!packet.answers.references?.trim())throw Error('Add a reference or reference notes first.');
 if(!Array.isArray(packet.foundations)||packet.foundations.length>ids.length)throw Error('Invalid foundation directions.');
 const seen=new Set();
 for(const f of packet.foundations){if(!exact(f,['id','notes','referenceIds'])||!ids.includes(f.id)||seen.has(f.id)||!text(f.notes,4000)||!Array.isArray(f.referenceIds)||f.referenceIds.some(id=>!known.has(id))||new Set(f.referenceIds).size!==f.referenceIds.length)throw Error('Invalid foundation references.');seen.add(f.id);}
 // A single reviewed document is also bounded before rendering/hashing/transfer.
 if(JSON.stringify(packet).length>160000)throw Error('The brief is too large.');
 return packet;
}
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function verifyBriefFiles(packet,files){
 validateBrief(packet);
 const expected=packet.references.filter(r=>r.kind==='file');
 if(!Array.isArray(files)||files.length!==expected.length)throw Error('Original files are missing. Reattach them before sending.');
 const seen=new Set();
 for(const item of files){
  const ref=expected.find(r=>r.id===item.id);
  if(!ref||seen.has(item.id)||!(item.blob instanceof Blob)||item.blob.size!==ref.size)throw Error('A reference file does not match the reviewed brief.');
  seen.add(item.id);if(await sha256(await item.blob.arrayBuffer())!==ref.sha256)throw Error('A reference file changed. Review the brief again.');
 }
 return packet;
}
export function assertPrivateRoom({roomId,expectedRoomId,sender,recipient,members,encryption,joined}){
 if(!expectedRoomId||roomId!==expectedRoomId||!/^![^\s:]+:.+$/.test(roomId)||!recipient||sender===recipient)throw Error('The private Anima room is not configured.');
 if(!joined||encryption!=='m.megolm.v1.aes-sha2')throw Error('Join the encrypted Anima room before sending.');
 // Include invites as well as joined users: never disclose to a third participant.
 const users=new Set(members);if(users.size!==2||!users.has(sender)||!users.has(recipient))throw Error('The delivery room must contain only you and the configured Anima recipient.');
}
