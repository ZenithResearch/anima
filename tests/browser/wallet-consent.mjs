import {reviewEmbeddedPresentation} from '../../runtime/embedded-wallet-connection.js';
const button=document.querySelector('#open-consent');
button.addEventListener('click',async()=>{
 button.disabled=true;
 const result=await reviewEmbeddedPresentation({token:'ui-fixture-never-signed',summary:{
  disclosure:{title:'Fixture: Anima service request',statements:['UI fixture only — no signing or transmission.','Review the exact selected brand brief and original reference.','Transport retention is separate from provider admission and completion.']},
  holder_public_key:'a'.repeat(64),caller:{kind:'browser',id:location.origin},audience:'Fixture receiver — no connection',issuer:'fixture',key_id:'fixture',request_digest_sha256:'b'.repeat(64),policy_digest_sha256:'c'.repeat(64),expires_at:Math.floor(Date.now()/1000)+120,confirm_by:Math.floor(Date.now()/1000)+60
 }});
 document.querySelector('#result').textContent=result?'Fixture approved. Nothing signed or sent.':'Fixture cancelled or expired. Nothing signed or sent.';button.disabled=false;button.focus();
});
