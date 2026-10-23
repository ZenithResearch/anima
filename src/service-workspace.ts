import {reviewStore} from './service-review-store.js';
import {requestSummary} from './service-review-view.js';
export async function showServiceRequests(host:HTMLElement,draftId:string,demo=false):Promise<void>{
 try{const records=await reviewStore(demo).load(draftId);if(!host.isConnected)return;
  if(records.length)host.innerHTML=records.map(requestSummary).join('');
 }catch{if(host.isConnected)host.textContent='Saved request records could not be opened. They have not been changed.';}
}
