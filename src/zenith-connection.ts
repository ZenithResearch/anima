import type {BriefDocument,BriefFile} from '../workspace/brief-delivery.mjs';
export type ConnectionStatus={authenticated:boolean;ready:boolean};
export type PrivateDeliveryReceipt={briefId:string;transport:'matrix'|'nostr';messageId:string;recipientId:string};
export function createZenithConnection(options:{demo:boolean;changed:(status:ConnectionStatus|null,note:string)=>void;sent:(receipt:PrivateDeliveryReceipt)=>void}){
 let popup:Window|null=null,nonce='',status:ConnectionStatus|null=null,timer=0,pending='',queued:{brief:BriefDocument;files:BriefFile[]}|null=null;
 // Pinned deployment setting, never a caller/query-supplied destination.
 const configured=document.querySelector<HTMLMetaElement>('meta[name="zenith-connection-origin"]')?.content||'';
 const origin=(()=>{try{const u=new URL(configured);return u.origin===configured&&(u.protocol==='https:'||(location.hostname==='127.0.0.1'&&u.origin==='http://127.0.0.1:4338'))?u.origin:'';}catch{return '';}})();
 const reset=(note:string)=>{status=null;options.changed(null,note);};
 const post=(kind:string,extra:Record<string,unknown>={})=>{if(popup&&!popup.closed)popup.postMessage({type:'zenith.matrix.connection.v1',nonce,kind,...extra},origin);};
 function open(){
  if(options.demo){reset('Walkthrough only. No Matrix connection is opened.');return;}
  if(!origin){reset('The Zenith connection address has not been configured.');return;}
  if(popup&&!popup.closed){popup.focus();post('hello');post('status');return;}
  nonce=crypto.randomUUID();pending='';reset('Opening Matrix sign-in…');
  popup=window.open(origin+'/','zenith-connection','popup,width=680,height=800');
  if(!popup){reset('Allow the Zenith connection window to open, then try again.');return;}
  let attempts=0;
  clearInterval(timer);timer=window.setInterval(()=>{
   if(!popup||popup.closed){clearInterval(timer);if(queued){queued=null;pending='';}reset(pending?'The connection closed before delivery was confirmed. Check Matrix before sending a new copy.':'Connection window closed. Your draft is saved here.');return;}
   if(!status?.authenticated)post('hello');attempts++;
   if(!status&&attempts===12)reset('The Zenith connection is not responding. Your brief has not been shared.');
  },1000);
 }
 window.addEventListener('message',event=>{
  if(event.origin!==origin||event.source!==popup||!nonce)return;
  const data=event.data;if(!data||data.type!=='zenith.matrix.connection.v1'||data.nonce!==nonce)return;
  if(data.kind==='status'&&typeof data.authenticated==='boolean'&&typeof data.ready==='boolean'){
   status={authenticated:data.authenticated,ready:data.ready&&data.authenticated};
   options.changed(status,status.ready?'Matrix connected. No Zenith membership is required.':'Sign in or create your Matrix account in the separate window.');
   if(status.ready&&queued){post('review',queued);queued=null;}
  }
  if(data.kind==='delivery'&&pending===data.briefId&&['sending','pending','unknown','cancelled'].includes(data.outcome)){
   if(data.outcome==='cancelled')pending='';
   options.changed(status,data.outcome==='sending'?'Confirm sending in the Matrix window.':data.outcome==='cancelled'?'Cancelled. Nothing sent.':'Check this request in Matrix before retrying. Keep the same brief ID.');
  }
  if(data.kind==='sent'&&pending===data.briefId&&['matrix','nostr'].includes(data.transport)&&['briefId','messageId','recipientId'].every(k=>typeof data[k]==='string'&&data[k].length>0&&data[k].length<512)){
   pending='';options.sent({briefId:data.briefId,transport:data.transport,messageId:data.messageId,recipientId:data.recipientId});
  }
 });
 return {open,ready:()=>!!status?.ready&&!!popup&&!popup.closed,
  review(brief:BriefDocument,files:BriefFile[]){
   if(options.demo)throw Error('The walkthrough never connects or sends.');
   if(pending)throw Error('This brief is already open for review. Confirm or retry that copy there.');
   if(!popup||popup.closed)open();
   if(!popup||popup.closed)throw Error('Allow the Matrix connection window to open. Your brief stays here.');
   pending=brief.id;
   if(status?.ready){post('review',{brief,files});popup.focus();}else queued={brief,files};
  }};
}
