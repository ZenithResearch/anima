import {providerMaterial} from './provider-materials.js';
import {emptyState,safeURL,addInvitationDrafts,getBrandQuestionnaire,saveBrandQuestionnaire,brandQuestionnaireSections,brandQuestionnaireProgress,activeBrandQuestion,prepareBrandRoundtableHandoff,brandHandoffIsCurrent,reconcileBrandHandoff,type BrandState,type Draft,type Asset} from '../workspace/domain.mjs';
import {brandPieces,pieceState,connectPiece,capturePath} from '../workspace/brand-pieces.mjs';
import {questionnaireView} from '../workspace/questionnaire-view.mjs';
import {consumeIntroduction,validDraftId} from '../workspace/introduction.mjs';
import * as browserStore from '../workspace/store.mjs';
import {createDemoStore} from './workspace-demo-store.js';
import {workspaceDashboard} from './workspace-marketing-view.js';
import {showServiceRequests} from './service-workspace.js';
import {marketingWorkspace,saveMarketingWorkspace,parsePalette,assetFolders,folderForAsset,isLogoAsset,isFontAsset,type Identity,type FolderId,workspaceBrief,saveWorkspaceBrief,briefMissing,foundationDefinitions,foundationDirection,saveFoundationDirection,type FoundationId,type FoundationDirection,type WorkspaceBrief} from './workspace-marketing-model.js';
import {workspaceBriefView,briefReferenceChoices} from './workspace-brief-view.js';
import {foundationDirectionView,foundationReferenceChoices} from './foundation-direction-view.js';
import {attachPinterestBoards} from './pinterest-model.js';
import {createPinterestPicker,type PinterestContext} from './pinterest-picker.js';
import {isPinterestURL} from './brand-references-model.js';
import {mountBrandQuestionFields} from './brand-question-fields.js';
import {brandQuestions,requiredProgress,brandAnswerSections,cardText} from './brand-package-model.js';
import {prepareBriefDelivery} from './brief-delivery.js';
import {createZenithConnection,type ConnectionStatus} from './zenith-connection.js';
import {defineSurface} from './surface.js';
defineSurface();
const get=<T extends Element>(s:string)=>document.querySelector<T>(s)!;
const escape=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const referenceName=(link:string)=>{const parsed=new URL(link);return isPinterestURL(link)?`Pinterest · ${parsed.pathname.replace(/\//g,' / ').replace(/^\s*\/\s*|\s*\/\s*$/g,'')||parsed.hostname}`:parsed.hostname;};
const url=new URL(location.href),candidate=url.searchParams.get('draft');
const demoMode=url.searchParams.get('demo')==='walkthrough';
const store=demoMode?createDemoStore():browserStore;
document.documentElement.dataset.workspaceMode=demoMode?'demo':'local';
let active:string|null=null;if(!demoMode)try{active=sessionStorage.getItem('anima.brand.active.v1');}catch{}
const draftId=validDraftId(candidate)?candidate:validDraftId(active)?active:crypto.randomUUID();
url.searchParams.set('draft',draftId);history.replaceState(null,'',url.pathname+url.search+url.hash);
if(!demoMode)try{sessionStorage.setItem('anima.brand.active.v1',draftId);}catch{}
let introduction:ReturnType<typeof consumeIntroduction>=null;if(!demoMode)try{introduction=consumeIntroduction(sessionStorage,draftId);}catch{}
let state:BrandState=emptyState(),draft:Draft=getBrandQuestionnaire(state),storageReady=true,dirty=false,timer=0,revision=0;
let queue:Promise<unknown>=Promise.resolve(),pieceId='',opener:HTMLElement|null=null;
const filesInMemory=new Map<string,File>();
let selectedFolder='all',assetQuery='',libraryOpen=matchMedia('(min-width:900px)').matches,coreKind:'logo'|'type'|'palette'='logo',inspectingAsset='',logoURL='',renderVersion=0;
let nameDraft:string|null=null,nameSaving=false;
let foundationMoreOpen=false,environmentOpen=false;
const dialog=get<HTMLDialogElement>('#questionnaire-dialog'),saveStatus=get<HTMLElement>('#workspace-save'),localStatus=get<HTMLElement>('#questionnaire-save-status');
function message(text:string){saveStatus.textContent=demoMode?'Demo · not saved':text==='Saving…'?text:text.startsWith('Draft saved')?'Saved locally':text.startsWith('Kept in this tab')||text.startsWith('Working in this tab')?'In this tab':'Check draft';saveStatus.title=demoMode?'Disposable walkthrough. Your saved drafts are untouched.':text;localStatus.textContent=demoMode?'Demo only. Changes disappear when the page reloads. Nothing sent.':text;}
function error(cause:unknown){const text=cause instanceof Error?cause.message:'We couldn’t finish that action. Your draft is still open.';get<HTMLElement>('#workspace-error').textContent=text;get<HTMLElement>('#workspace-error').hidden=false;message(text);}
function serial<T>(fn:()=>Promise<T>):Promise<T>{const task=queue.then(fn);queue=task.catch(()=>{});return task;}
async function commit(next:BrandState,files:[string,File][]=[],removed:string[]=[]){
 next=reconcileBrandHandoff(next);
 if(storageReady){try{await store.save(draftId,next,files,removed);}catch{storageReady=false;}}
 if(!storageReady)for(const [id,file] of files)filesInMemory.set(id,file);
 state=next;message(storageReady?'Draft saved on this browser. Nothing sent.':'Kept in this tab. Browser saving is unavailable.');
}
function guard(fn:()=>void|Promise<unknown>){return (event:Event)=>{event.preventDefault();void Promise.resolve().then(fn).catch(error);};}
function renderDashboard(){
 const search=document.activeElement as HTMLInputElement|null,refocus=search?.id==='workspace-asset-search',selection=search?.selectionStart;
 const library=document.querySelector<HTMLDetailsElement>('.workspace-library');if(library)libraryOpen=library.open;
 const environment=document.querySelector<HTMLDetailsElement>('.workspace-environment');if(environment)environmentOpen=environment.open;
 const more=document.querySelector<HTMLDetailsElement>('.foundation-more');if(more)foundationMoreOpen=more.open;
 get<HTMLAnchorElement>('.workspace-home').href=url.pathname+url.search;
 get<HTMLElement>('#workspace-content').innerHTML=workspaceDashboard(state,draftId,selectedFolder,assetQuery,libraryOpen);
 get<HTMLDetailsElement>('.foundation-more').open=foundationMoreOpen;
 get<HTMLDetailsElement>('.workspace-environment').open=environmentOpen;
 void showServiceRequests(get<HTMLElement>('[data-service-request-list]'),draftId,demoMode);
 if(nameDraft!==null)showNameEditor(false);
 if(refocus){const input=get<HTMLInputElement>('#workspace-asset-search');input.focus({preventScroll:true});if(selection!==null&&selection!==undefined)input.setSelectionRange(selection,selection);}
 if(logoURL){URL.revokeObjectURL(logoURL);logoURL='';}
 const version=++renderVersion,id=marketingWorkspace(state,draftId).identity.logoAssetId,asset=state.assets.find(a=>a.id===id);
 if(asset&&/^image\/(png|jpeg|gif|webp|avif)$/.test(asset.type||''))void (async()=>{
  const file=filesInMemory.get(id)||await store.file(id);if(!file||version!==renderVersion)return;
  logoURL=URL.createObjectURL(file);const image=document.createElement('img');image.src=logoURL;image.alt=asset.name;
  get('[data-logo-preview]').replaceChildren(image);
 })().catch(()=>{});
}
function showNameEditor(focus=true){
 const form=get<HTMLFormElement>('[data-name-editor]'),input=get<HTMLInputElement>('#workspace-brand-name');
 get<HTMLElement>('#workspace-title').hidden=true;form.hidden=false;input.value=nameDraft??'';input.readOnly=nameSaving;
 form.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=nameSaving);
 if(focus){input.focus({preventScroll:true});input.select();}
}
function cancelNameEdit(){
 if(nameSaving)return;nameDraft=null;get<HTMLElement>('[data-name-editor]').hidden=true;get<HTMLElement>('#workspace-title').hidden=false;
 get<HTMLElement>('#workspace-name-error').hidden=true;get<HTMLElement>('[data-edit-name]').focus({preventScroll:true});
}
async function saveInlineName(){
 if(nameSaving)return;
 const name=(nameDraft??'').trim(),feedback=get<HTMLElement>('#workspace-name-error');
 if(!name){feedback.textContent='Enter a brand name.';feedback.hidden=false;get<HTMLInputElement>('#workspace-brand-name').focus();return;}
 nameSaving=true;showNameEditor(false);feedback.hidden=true;
 try{await serial(()=>commit({...state,brand:{...state.brand,name}}));nameDraft=null;nameSaving=false;renderDashboard();get<HTMLElement>('[data-edit-name]').focus({preventScroll:true});}
 catch(cause){nameSaving=false;showNameEditor(false);const current=get<HTMLElement>('#workspace-name-error');current.textContent=cause instanceof Error?cause.message:'The name could not be saved. Try again.';current.hidden=false;}
}
function closeWorkspaceDialog(id:string,selector:string){get<HTMLDialogElement>(id).close();renderDashboard();get<HTMLElement>(selector)?.focus({preventScroll:true});}
function showDialogError(selector:string,cause:unknown){const el=get<HTMLElement>(selector);el.textContent=cause instanceof Error?cause.message:'That change could not be saved.';el.hidden=false;}
let activeBrief:WorkspaceBrief|undefined,briefReview=false;
let packageFields:ReturnType<typeof mountBrandQuestionFields>|undefined;
let connectionState:ConnectionStatus|null=null,connectionNote='Continue with Matrix when you’re ready to send. No Zenith membership is required.',deliveryPreparing=false,connectionTouched=false;
const zenith=createZenithConnection({demo:demoMode,changed:(status,note)=>{connectionState=status;connectionNote=note;renderConnection();},sent:receipt=>{connectionNote='Sent to Matrix. Your local brief is unchanged.';renderConnection();message('Sent to Matrix.');void serial(()=>commit({...state,world:{...state.world,lastPrivateDelivery:{version:1,...receipt,sentAt:new Date().toISOString()}}})).catch(error);}});
function renderConnection(){
 const headerNote=document.querySelector<HTMLElement>('#zenith-connection-status');if(headerNote){headerNote.textContent=connectionState?.ready?'Matrix connected.':connectionNote;headerNote.hidden=!connectionTouched;}
 document.querySelectorAll<HTMLElement>('[data-connect-zenith]').forEach(button=>button.textContent=connectionState?.ready?'Matrix connected':'Continue with Matrix');
 const note=document.querySelector<HTMLElement>('#brief-delivery-note');if(note)note.textContent=connectionNote;
 const send=document.querySelector<HTMLButtonElement>('[data-send-brief]');if(send){send.disabled=demoMode||deliveryPreparing;send.textContent=connectionState?.authenticated?'Review & send':'Continue with Matrix';}
}
document.addEventListener('click',event=>{if((event.target as Element).closest('[data-connect-zenith]')){connectionTouched=true;zenith.open();}});

const packageDialog=get<HTMLDialogElement>('#workspace-package-dialog'),packageForm=get<HTMLFormElement>('#workspace-package-form');
function collectBrief():WorkspaceBrief{
 const data=new FormData(packageForm),brief=activeBrief!;
 return {...brief,answers:{...brief.answers},peopleEntries:brief.peopleEntries?[...brief.peopleEntries]:undefined,assetIds:data.getAll('briefAsset').map(String)};
}
function briefFeedback(){
 if(!activeBrief)return;activeBrief=collectBrief();const missing=briefMissing(activeBrief);
 for(const q of brandQuestions)get(`[data-brief-state="${q.id}"]`).textContent=cardText(activeBrief,q.id).trim()||q.id==='references'&&activeBrief.assetIds.length?'Answered':q.id==='references'?'Optional':'Explore';
 get('[data-brief-status]').textContent=`${requiredProgress(activeBrief)} · shared by every foundation. Save to keep your answers. Nothing sent or generated.`;
 get<HTMLElement>('[data-brief-review]').hidden=true;get<HTMLElement>('[data-brief-error]').hidden=true;
}
function openPackage(context:string){
 briefReview=false;opener=document.activeElement as HTMLElement;activeBrief=workspaceBrief(state);if(context!=='review')activeBrief.promptSet='experience-v3';packageFields?.destroy();
 packageForm.innerHTML=workspaceBriefView(activeBrief,state.assets);packageFields=mountBrandQuestionFields(packageForm,()=>activeBrief!,briefFeedback);renderConnection();packageDialog.showModal();get<HTMLElement>('#workspace-package-title').setAttribute('tabindex','-1');renderConnection();get<HTMLElement>('#workspace-package-title').focus();
}
function openBriefReview(){
 if(briefMissing(workspaceBrief(state)).length)return;
 openPackage('review');briefReview=true;
 get('#workspace-package-title').textContent='Review brand brief';get('[data-close-package]').setAttribute('aria-label','Close brief review');
 get<HTMLElement>('.package-question-grid').hidden=true;get<HTMLElement>('[data-brief-status]').hidden=true;get<HTMLElement>('#workspace-package-form > .package-brief-actions').hidden=true;
 get('[data-brief-intro]').textContent='Your shared answers and references.';
 get<HTMLElement>('[data-brief-review]').hidden=false;get('[data-brief-review-summary]').textContent=requiredProgress(activeBrief!)+'.';
 get<HTMLElement>('[data-brief-overview]').hidden=false;get('[data-brief-overview]').innerHTML=brandAnswerSections(activeBrief!).map(s=>`<div><h4>${escape(s.label)}</h4><p>${escape(s.text||'Left open')}</p></div>`).join('')+`<div><h4>Shared references</h4>${activeBrief!.assetIds.map(id=>`<p>${escape(state.assets.find(a=>a.id===id)?.name||'Reference')}</p>`).join('')}${activeBrief!.answers.references?`<p>${escape(activeBrief!.answers.references)}</p>`:''}</div>`;
 get<HTMLElement>('#workspace-package-title').focus();
}
async function persistBrief(){const snapshot=collectBrief();await serial(()=>commit(saveWorkspaceBrief(state,snapshot)));activeBrief=snapshot;renderDashboard();}
function returnFromPackage(){packageDialog.close();if(packageFromTeam&&teamDialog.open){packageFromTeam=false;get<HTMLElement>('[data-find-brand]').focus({preventScroll:true});}else get<HTMLElement>(briefReview?'[data-review-brief]':'[data-shape-package="all"]')?.focus({preventScroll:true});}
async function closePackage(){try{await persistBrief();returnFromPackage();}catch(cause){showDialogError('[data-brief-error]',cause);}}
packageForm.addEventListener('change',event=>{if((event.target as HTMLInputElement).name==='briefAsset')briefFeedback();});
packageForm.addEventListener('click',event=>{
 const button=(event.target as Element).closest<HTMLElement>('button');
 if(button?.hasAttribute('data-close-package'))void closePackage();
 if(button?.hasAttribute('data-edit-brief-questions')){packageDialog.close();openPackage('all');}
 if(button?.hasAttribute('data-send-brief')&&!deliveryPreparing){
  deliveryPreparing=true;renderConnection();void (async()=>{
   await persistBrief();
   const packet=await prepareBriefDelivery(state,async id=>filesInMemory.get(id)||await store.file(id));
   zenith.review(packet.brief,packet.files);connectionNote='Continue with Matrix, then confirm the recipient, brief and original files. Nothing has been sent yet.';
  })().catch(cause=>{connectionNote=cause instanceof Error?cause.message:'The brief could not be prepared.';}).finally(()=>{deliveryPreparing=false;renderConnection();});
 }
 if(button?.hasAttribute('data-brief-add-material')){activeBrief=collectBrief();openDiscovery('materials');}
 if(button?.hasAttribute('data-service-from-brief'))void (async()=>{await persistBrief();if(briefMissing(workspaceBrief(state)).length)throw Error('Complete the shared brand questions first.');location.href=demoMode?'service.html?preview=1':'service.html?draft='+encodeURIComponent(draftId);})().catch(cause=>showDialogError('[data-brief-error]',cause));
});
packageDialog.addEventListener('cancel',event=>{event.preventDefault();void closePackage();});
packageForm.addEventListener('submit',event=>{event.preventDefault();void (async()=>{
 await persistBrief();const review=(event as SubmitEvent).submitter?.getAttribute('value')==='review';
 if(!review){returnFromPackage();return;}
 const missing=briefMissing(activeBrief!);
 if(missing.length){
  showDialogError('[data-brief-error]',Error('Complete the required brand questions first. Your partial answers have been saved.'));
  const card=get<HTMLDetailsElement>(`[data-brief-question="${missing[0]}"]`);card.open=true;card.querySelector<HTMLElement>('textarea,button,input')?.focus();return;
 }
 packageDialog.close();openBriefReview();
 })().catch(cause=>showDialogError('[data-brief-error]',cause));});
get('[data-core-package]').addEventListener('click',()=>{get<HTMLDialogElement>('#workspace-identity-dialog').close();openPackage(coreKind);});
function openCore(kind:'logo'|'type'|'palette'){
 coreKind=kind;opener=document.activeElement as HTMLElement;const settings=marketingWorkspace(state,draftId);
 get('#identity-dialog-title').textContent=kind==='logo'?'Logo':kind==='type'?'Typography':'Color palette';
 for(const panel of document.querySelectorAll<HTMLElement>('[data-identity-panel]'))panel.hidden=panel.dataset.identityPanel!==kind;
 get<HTMLSelectElement>('#identity-logo-select').innerHTML='<option value="">No logo selected</option>'+state.assets.filter(isLogoAsset).map(a=>`<option value="${escape(a.id)}">${escape(a.name)}</option>`).join('');
 get<HTMLSelectElement>('#identity-logo-select').value=settings.identity.logoAssetId;
 get<HTMLInputElement>('#identity-font-family').value=settings.identity.fontFamily;
 get('#identity-font-files').innerHTML=state.assets.filter(isFontAsset).map(a=>`<label class="asset-choice"><input type="checkbox" name="fontAssetIds" value="${escape(a.id)}" ${settings.identity.fontAssetIds.includes(a.id)?'checked':''}><span>${escape(a.name)}</span></label>`).join('')||'<p class="form-note">Add font files to keep them with your typeface.</p>';
 get<HTMLTextAreaElement>('#identity-palette').value=settings.identity.palette.join('\n');get<HTMLElement>('[data-identity-error]').hidden=true;
 get<HTMLDialogElement>('#workspace-identity-dialog').showModal();
 get<HTMLElement>(kind==='logo'?'#identity-logo-select':kind==='type'?'#identity-font-family':'#identity-palette').focus();
}
let activeFoundation:FoundationId='logo',foundationBusy=false;
const foundationDialog=get<HTMLDialogElement>('#foundation-direction-dialog'),foundationForm=get<HTMLFormElement>('#foundation-direction-form');
function collectFoundation():FoundationDirection{
 const data=new FormData(foundationForm);return {notes:String(data.get('foundationNotes')||''),assetIds:data.getAll('foundationAsset').map(String)};
}
function setFoundationBusy(value:boolean){
 foundationBusy=value;foundationForm.setAttribute('aria-busy',String(value));
 foundationForm.querySelectorAll<HTMLButtonElement|HTMLInputElement>('[data-close-foundation],button[type="submit"],[data-foundation-add-link],[data-foundation-upload],#foundation-reference-url,[name="foundationAsset"]').forEach(control=>control.disabled=value);
 get<HTMLTextAreaElement>('#foundation-notes').readOnly=value;
}
function openFoundation(id:FoundationId){
 if(!foundationDefinitions.some(f=>f.id===id))return;
 if(briefMissing(workspaceBrief(state)).length){openPackage('all');return;}
 activeFoundation=id;foundationForm.innerHTML=foundationDirectionView(state,id,foundationDirection(state,id));foundationDialog.showModal();
 get<HTMLTextAreaElement>('#foundation-notes').focus();
}
async function closeFoundation(){
 if(foundationBusy)return;const direction=collectFoundation();setFoundationBusy(true);
 try{await serial(()=>commit(saveFoundationDirection(state,activeFoundation,direction)));foundationDialog.close();renderDashboard();get<HTMLElement>(`[data-foundation="${activeFoundation}"]`)?.focus({preventScroll:true});}
 catch(cause){showDialogError('[data-foundation-error]',cause);}finally{setFoundationBusy(false);}
}
async function addFoundationLink(){
 if(foundationBusy)return;const input=get<HTMLInputElement>('#foundation-reference-url'),link=safeURL(input.value.trim());
 if(!link){showDialogError('[data-foundation-error]',Error('Add a complete Pinterest board or reference link without embedded credentials.'));input.focus();return;}
 const direction=collectFoundation();setFoundationBusy(true);
 try{
  await serial(async()=>{
   let asset=state.assets.find(a=>a.kind==='link'&&a.url===link);let next=state;
   if(!asset){asset={id:crypto.randomUUID(),kind:'link',url:link,name:referenceName(link)};next={...state,assets:[...state.assets,asset]};}
   direction.assetIds=[...new Set([...direction.assetIds,asset.id])];await commit(saveFoundationDirection(next,activeFoundation,direction));
  });
  get('#foundation-reference-choices').innerHTML=foundationReferenceChoices(state,direction);input.value='';get<HTMLElement>('[data-foundation-error]').hidden=true;get('[data-foundation-status]').textContent='Reference attached and saved in the asset library. Nothing imported or sent.';renderDashboard();
 }catch(cause){showDialogError('[data-foundation-error]',cause);}finally{setFoundationBusy(false);}
}
async function addFoundationFiles(files:File[]){
 if(foundationBusy||!files.length)return;
 if(files.some(file=>file.size>25*1024*1024)){showDialogError('[data-foundation-error]',Error('Keep each file under 25 MB.'));return;}
 const direction=collectFoundation(),additions:Asset[]=files.map(file=>({id:crypto.randomUUID(),name:file.name,kind:'file',type:file.type,size:file.size,originalName:file.name,capturePath:capturePath(file.name)}));setFoundationBusy(true);
 try{
  direction.assetIds=[...direction.assetIds,...additions.map(a=>a.id)];
  await serial(()=>commit(saveFoundationDirection({...state,assets:[...state.assets,...additions]},activeFoundation,direction),additions.map((a,i)=>[a.id,files[i]!] as [string,File])));
  get('#foundation-reference-choices').innerHTML=foundationReferenceChoices(state,direction);get<HTMLElement>('[data-foundation-error]').hidden=true;get('[data-foundation-status]').textContent='Files attached and saved in the asset library. Nothing sent.';renderDashboard();
 }catch(cause){showDialogError('[data-foundation-error]',cause);}finally{setFoundationBusy(false);get<HTMLInputElement>('[data-foundation-upload]').value='';}
}
foundationForm.addEventListener('submit',event=>{event.preventDefault();void closeFoundation();});
foundationForm.addEventListener('click',event=>{const button=(event.target as Element).closest('button');if(button?.hasAttribute('data-close-foundation'))void closeFoundation();if(button?.hasAttribute('data-foundation-add-link'))void addFoundationLink();});
foundationForm.addEventListener('keydown',event=>{if((event.target as Element).id==='foundation-reference-url'&&event.key==='Enter'){event.preventDefault();void addFoundationLink();}});
foundationForm.addEventListener('input',()=>{get('[data-foundation-status]').textContent='Save to keep your direction. Nothing sent.';});
foundationForm.addEventListener('change',event=>{const input=event.target as HTMLInputElement;if(input.hasAttribute('data-foundation-upload'))void addFoundationFiles([...input.files||[]]);});
foundationDialog.addEventListener('cancel',event=>{event.preventDefault();void closeFoundation();});
const pinterestPicker=createPinterestPicker({dialog:get<HTMLDialogElement>('#pinterest-picker-dialog'),draft:draftId,demo:demoMode,
 canAssign:()=>!briefMissing(workspaceBrief(state)).length,canAuthorize:()=>storageReady,
 attach:async(selections,global)=>{await serial(()=>commit(attachPinterestBoards(state,selections,global)));renderDashboard();syncPinterestReferences();},
 returned:()=>{syncPinterestReferences();if(!document.querySelector('dialog[open]'))get<HTMLElement>('[data-pinterest-open="library"]')?.focus({preventScroll:true});}
});
function syncPinterestReferences(){
 if(dialog.open){draft=getBrandQuestionnaire(state);renderQuestionnaire();}
 if(foundationDialog.open)get('#foundation-reference-choices').innerHTML=foundationReferenceChoices(state,foundationDirection(state,activeFoundation));
 if(packageDialog.open){activeBrief=workspaceBrief(state);get('#brief-reference-choices').innerHTML=briefReferenceChoices(state.assets,activeBrief.assetIds);briefFeedback();}
}
async function openPinterest(context:PinterestContext,result?:string){
 if(packageDialog.open)await persistBrief();
 if(dialog.open)await flush();
 if(foundationDialog.open){if(foundationBusy)return;await serial(()=>commit(saveFoundationDirection(state,activeFoundation,collectFoundation())));}
 await pinterestPicker.open(context,result);
}
// Delegation also covers buttons recreated when the dashboard or dialogs render.
document.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-pinterest-open]');if(button){const context=button.dataset.pinterestOpen==='foundation'?activeFoundation:button.dataset.pinterestOpen as PinterestContext;void openPinterest(context).catch(error);}});
async function addCoreFiles(kind:string,files:File[]){
 if(!files.length)return;
 if(files.some(f=>f.size>25*1024*1024))throw Error('Keep each file under 25 MB.');
 const additions:Asset[]=files.map(f=>({id:crypto.randomUUID(),name:f.name,kind:'file',type:f.type,size:f.size,originalName:f.name,capturePath:capturePath(f.name)}));
 if(additions.some(a=>kind==='logo'?!isLogoAsset(a):!isFontAsset(a)))throw Error(kind==='logo'?'Choose an image or SVG logo.':'Choose WOFF, WOFF2, OTF or TTF font files.');
 const family=get<HTMLInputElement>('#identity-font-family').value;
 await serial(async()=>{
  const settings=marketingWorkspace(state,draftId),next={...state,assets:[...state.assets,...additions]};
  const identity={...settings.identity,...(kind==='logo'?{logoAssetId:additions[0]!.id}:{fontFamily:family,fontAssetIds:[...settings.identity.fontAssetIds,...additions.map(a=>a.id)]})};
  const folders={...settings.assetFolders};for(const a of additions)folders[a.id]='identity';
  await commit(saveMarketingWorkspace(next,{...settings,identity,assetFolders:folders}),additions.map((a,i)=>[a.id,files[i]!]));
 });
 renderDashboard();openCore(kind==='logo'?'logo':'type');
}
let teamMode:'invite'|'find'='invite',teamLoaded=false,packageFromTeam=false;
const teamDialog=get<HTMLDialogElement>('#workspace-team-dialog');
function renderInvitationDrafts(){
 const drafts=Array.isArray(state.world?.invitationDrafts)?state.world.invitationDrafts:[];
 get<HTMLElement>('[data-draft-heading]').hidden=!drafts.length;get('[data-invite-count]').textContent=String(drafts.length);
 get('#team-invitation-drafts').innerHTML=drafts.map(d=>`<li><div><span>${escape(d.email)}</span><small>Not sent</small></div><button type="button" class="team-remove" data-remove-invite="${escape(d.email)}" aria-label="Remove invitation for ${escape(d.email)}">×</button></li>`).join('');
}
function showTeamChoices(profile=false){
 get<HTMLElement>('[data-team-choices]').hidden=profile;get<HTMLElement>('[data-team-profile]').hidden=!profile;get<HTMLElement>('[data-team-save]').hidden=profile||(teamMode==='find'&&!get<HTMLDetailsElement>('.team-search-details').open);
 get('#workspace-team-title').textContent=profile?'Connect Rolodex':teamMode==='invite'?'Invite teammates':'Find teammates';
}
function openTeam(mode:'invite'|'find'){
 teamMode=mode;opener=document.activeElement as HTMLElement;showTeamChoices();
 get<HTMLElement>('[data-team-invite]').hidden=mode!=='invite';get<HTMLElement>('[data-team-find]').hidden=mode!=='find';
 get('[data-team-submit]').textContent=mode==='invite'?'Save drafts':'Save search';
 if(!teamLoaded){get<HTMLTextAreaElement>('#team-search-context').value=state.collaboration.context||'';teamLoaded=true;}
 get<HTMLDetailsElement>('.team-search-details').open=Boolean(get<HTMLTextAreaElement>('#team-search-context').value);showTeamChoices();
 get('[data-team-feedback]').textContent='';get<HTMLElement>('[data-team-error]').hidden=true;renderInvitationDrafts();teamDialog.showModal();
 get<HTMLElement>(mode==='invite'?'#team-invite-emails':'[data-find-rolodex]').focus();
}
get('#workspace-team-form').addEventListener('click',event=>{
 const button=(event.target as Element).closest<HTMLElement>('button');if(!button)return;
 if(button.hasAttribute('data-find-rolodex')){showTeamChoices(true);get<HTMLElement>('[data-team-back]').focus();}
 if(button.hasAttribute('data-team-back')){showTeamChoices();get<HTMLElement>('[data-find-rolodex]').focus();}
 if(button.hasAttribute('data-find-brand')){packageFromTeam=true;openPackage('all');}
 if(button.dataset.removeInvite){const email=button.dataset.removeInvite;void serial(()=>commit({...state,world:{...state.world,invitationDrafts:(state.world?.invitationDrafts||[]).filter(d=>d.email!==email)}})).then(()=>{renderInvitationDrafts();renderDashboard();get('[data-team-feedback]').textContent='Draft removed.';get<HTMLInputElement>('#team-invite-emails').focus();}).catch(cause=>showDialogError('[data-team-error]',cause));}
});
get('#workspace-team-form').addEventListener('submit',event=>{event.preventDefault();void (async()=>{
 if(teamMode==='invite'){
  const input=get<HTMLInputElement>('#team-invite-emails'),emails=input.value.split(',');let added=0;
  await serial(async()=>{const next=addInvitationDrafts(state,emails);added=(next.world?.invitationDrafts?.length||0)-(state.world?.invitationDrafts?.length||0);await commit(next);});
  input.value='';input.removeAttribute('aria-invalid');renderInvitationDrafts();get('[data-team-feedback]').textContent=added?`${added} ${added===1?'draft':'drafts'} added. Not sent.`:'Already in your team or invitations.';input.focus();
 }else{
  const input=get<HTMLTextAreaElement>('#team-search-context'),context=input.value.trim();if(!context){get<HTMLDetailsElement>('.team-search-details').open=true;input.focus();throw Error('Describe who you’re looking for.');}
  await serial(()=>commit({...state,collaboration:{...state.collaboration,context}}));get('[data-team-feedback]').textContent='Search saved. Matching is not connected.';
 }
 get<HTMLElement>('[data-team-error]').hidden=true;renderDashboard();
 })().catch(cause=>{if(teamMode==='invite'){get<HTMLInputElement>('#team-invite-emails').setAttribute('aria-invalid','true');get<HTMLInputElement>('#team-invite-emails').focus();}showDialogError('[data-team-error]',cause);});});
get<HTMLDetailsElement>('.team-search-details').addEventListener('toggle',()=>{if(teamMode==='find'&&!get<HTMLElement>('[data-team-choices]').hidden)get<HTMLElement>('[data-team-save]').hidden=!get<HTMLDetailsElement>('.team-search-details').open;});
get('#team-invite-emails').addEventListener('input',()=>{get<HTMLInputElement>('#team-invite-emails').removeAttribute('aria-invalid');get<HTMLElement>('[data-team-error]').hidden=true;});
teamDialog.addEventListener('close',()=>get<HTMLElement>(teamMode==='invite'?'[data-invite-team]':'[data-find-teammates]')?.focus({preventScroll:true}));
function openAsset(id:string){
 const asset=state.assets.find(a=>a.id===id);if(!asset)return;inspectingAsset=id;opener=document.activeElement as HTMLElement;
 const provenance=providerMaterial(state,id);
 get('#asset-dialog-title').textContent=asset.name;get('#asset-details').textContent=asset.pinterest?asset.pinterest.title:asset.capturePath||(asset.kind==='link'?asset.url||'Link':'Local original file');
 if(provenance)get('#asset-details').textContent=`Provider work · ${provenance.providerId} · version ${provenance.version}\nRequest ${provenance.requestId}\nDeliverable ${provenance.deliverableId}\nSHA-256 ${provenance.sha256}\n${provenance.receiptIds.length} receipt references. File integrity checked on import; this is not signature verification.`;
 get('#asset-open-action').innerHTML=asset.pinterest?`<p class="form-note">Pinterest board · ${escape(asset.pinterest.owner)} · ${escape(asset.pinterest.privacy.toLowerCase())} · ${asset.pinterest.pinCount} pins. Board contents are not copied.</p><button type="button" data-pinterest-open="library">Choose Pinterest boards</button>`:asset.kind==='file'?`<button type="button" data-download-file="${escape(id)}">Download original ↓</button>`:`<a class="surface-link" href="${escape(safeURL(asset.url)||'#')}" target="_blank" rel="noopener noreferrer">Open original link ↗</a>`;
 get<HTMLSelectElement>('#asset-folder').innerHTML=assetFolders.map(f=>`<option value="${f.id}">${escape(f.label)}</option>`).join('');get<HTMLSelectElement>('#asset-folder').value=folderForAsset(state,asset,marketingWorkspace(state,draftId));
 get<HTMLElement>('[data-asset-error]').hidden=true;get<HTMLDialogElement>('#workspace-asset-dialog').showModal();get<HTMLSelectElement>('#asset-folder').focus();
}

function progress(){const p=brandQuestionnaireProgress(draft);get<HTMLElement>('#questionnaire-progress-label').textContent=`${p.answered} of ${p.total} fragments shared`;get<HTMLProgressElement>('#questionnaire-progress').value=p.answered;}
function renderQuestionnaire(focus=false){
 draft.step='materials';
 get<HTMLElement>('#questionnaire-body').innerHTML=questionnaireView(draft,state.assets,state.world?.brandRoundtableHandoff);
 for(const item of get('#questionnaire-body').querySelectorAll('[data-questionnaire-step],.section-description'))item.remove();
 get<HTMLElement>('#questionnaire-section-title').classList.add('sr-only');
 const section=brandQuestionnaireSections.find(s=>s.id===draft.step),last=brandQuestionnaireSections.at(-1)!;
 get<HTMLButtonElement>('#questionnaire-back').hidden=draft.step==='materials';
 get<HTMLButtonElement>('#questionnaire-next').textContent=draft.step==='review'?'Prepare roundtable handoff':draft.step==='materials'?'Continue to questions':section===last&&activeBrandQuestion(draft).id===last.questions.at(-1)!.id?'Gather the threads':'Continue';
 get<HTMLButtonElement>('#questionnaire-save-close').hidden=false;
 get<HTMLButtonElement>('#questionnaire-next').hidden=true;
 get<HTMLButtonElement>('#questionnaire-download').hidden=!brandHandoffIsCurrent(state.world?.brandRoundtableHandoff,draft);
 progress();if(focus)get<HTMLElement>('#questionnaire-section-title').focus({preventScroll:true});
 get<HTMLElement>('#questionnaire-body').scrollTop=0;
}
async function flush(){
 clearTimeout(timer);if(!dirty)return;
 const snapshot={...draft,answers:{...draft.answers},origins:{...draft.origins},sourceIds:[...draft.sourceIds]},atRevision=revision;
 await serial(async()=>{await commit(saveBrandQuestionnaire(state,snapshot));if(atRevision===revision)dirty=false;});
}
function schedule(){get<HTMLButtonElement>('#questionnaire-download').hidden=true;dirty=true;revision++;clearTimeout(timer);message('Saving…');timer=window.setTimeout(()=>void flush().catch(error),450);}
async function move(step:string,questionId?:string){
 await flush();draft.step=step;const section=brandQuestionnaireSections.find(s=>s.id===step);if(section)draft.activeQuestion=questionId||section.questions[0]!.id;
 dirty=true;revision++;await flush();renderQuestionnaire(true);
}
async function closeDiscovery(){await flush();dialog.close();renderDashboard();if(packageDialog.open&&activeBrief){get('#brief-reference-choices').innerHTML=briefReferenceChoices(state.assets,activeBrief.assetIds);get<HTMLElement>('[data-brief-add-material]').focus();}else{const target=opener?.isConnected?opener:opener?.matches('.library-add')&&libraryOpen?get<HTMLElement>('.library-add[data-open-discovery]'):get<HTMLElement>('#workspace-inputs [data-open-discovery]');target.focus({preventScroll:true});}}
function openDiscovery(start?:string){draft=getBrandQuestionnaire(state);if(start)draft.step=start;opener=document.activeElement instanceof HTMLButtonElement?document.activeElement:null;renderQuestionnaire();dialog.showModal();}
async function acceptFiles(files:File[]){
 if(!files.length)return;const max=25*1024*1024;
 if(files.some(f=>f.size>max))throw Error('Keep each file under 25 MB. Your existing material is unchanged.');
 await flush();await serial(async()=>{
  const additions:Asset[]=files.map(f=>({id:crypto.randomUUID(),name:f.name,kind:'file',type:f.type,size:f.size,originalName:f.name,capturePath:capturePath(f.webkitRelativePath||f.name)}));
  const next=saveBrandQuestionnaire({...state,assets:[...state.assets,...additions]},{...draft,sourceIds:[...draft.sourceIds,...additions.map(a=>a.id)]});
  await commit(next,additions.map((a,i)=>[a.id,files[i]!]));draft=getBrandQuestionnaire(state);renderDashboard();renderQuestionnaire();
 });
}
async function addLink(){
 const input=get<HTMLInputElement>('#questionnaire-link'),link=safeURL(input.value.trim());if(!link)throw Error('Add a complete http:// or https:// link without embedded credentials.');
 await flush();await serial(async()=>{const asset:Asset=state.assets.find(a=>a.kind==='link'&&a.url===link)||{id:crypto.randomUUID(),kind:'link',url:link,name:referenceName(link)};await commit(saveBrandQuestionnaire({...state,assets:state.assets.some(a=>a.id===asset.id)?state.assets:[...state.assets,asset]},{...draft,sourceIds:[...new Set([...draft.sourceIds,asset.id])]}));draft=getBrandQuestionnaire(state);renderDashboard();renderQuestionnaire();});
}
function download(value:Blob,filename:string){const objectURL=URL.createObjectURL(value),link=document.createElement('a');link.href=objectURL;link.download=filename;link.click();window.setTimeout(()=>URL.revokeObjectURL(objectURL),1000);}
function openPiece(id:string){
 const piece=brandPieces.find(p=>p.id===id);if(!piece)return;pieceId=id;opener=document.activeElement as HTMLElement;
 get<HTMLElement>('#piece-title').textContent=id==='creative-assets'?'Outward deliverables':piece.title;get<HTMLElement>('#piece-description').textContent='Select files or links.';
 const selected=new Set(pieceState(state,id).assetIds);
 get<HTMLElement>('#piece-files').innerHTML=state.assets.length?state.assets.map(a=>`<label class="asset-choice"><input type="checkbox" name="assets" value="${a.id}" ${selected.has(a.id)?'checked':''}><span>${escape(a.name)}</span></label>`).join(''):'<p>Add files or links to your library first.</p>';
 get<HTMLDialogElement>('#piece-dialog').showModal();
}
get('#workspace-content').addEventListener('click',event=>{
 const button=(event.target as Element).closest<HTMLElement>('button');if(!button)return;
 if(button.hasAttribute('data-edit-name')){nameDraft=state.brand.name||'';showNameEditor();}
 if(button.hasAttribute('data-cancel-name'))cancelNameEdit();
 if(button.dataset.shapePackage)openPackage(button.dataset.shapePackage);
 if(button.hasAttribute('data-review-brief'))openBriefReview();
 if(button.dataset.core)openCore(button.dataset.core as 'logo'|'type'|'palette');
 if(button.dataset.foundation)openFoundation(button.dataset.foundation as FoundationId);
 if(button.hasAttribute('data-invite-team'))openTeam('invite');
 if(button.hasAttribute('data-find-teammates'))openTeam('find');
 if(button.dataset.inspectAsset)openAsset(button.dataset.inspectAsset);
 if(button.dataset.folder){selectedFolder=button.dataset.folder;renderDashboard();get<HTMLElement>(`[data-folder="${selectedFolder}"]`).focus({preventScroll:true});}
 if(button.hasAttribute('data-open-discovery'))openDiscovery(button.dataset.openDiscovery||undefined);
 if(button.dataset.piece)openPiece(button.dataset.piece);
 if(button.hasAttribute('data-edit-brand')){const form=get<HTMLFormElement>('#brand-details-form');for(const key of ['name','description','website'])(form.elements.namedItem(key) as HTMLInputElement).value=state.brand[key]||'';opener=button;get<HTMLDialogElement>('#brand-details-dialog').showModal();}
 if(button.dataset.downloadFile)void (async()=>{const id=button.dataset.downloadFile!,asset=state.assets.find(a=>a.id===id);const file=filesInMemory.get(id)||await store.file(id);if(!file)throw Error('The original file is not available in this browser.');download(file,asset?.originalName||file.name);})().catch(error);
});
const libraryBreakpoint=matchMedia('(min-width:900px)');
libraryBreakpoint.addEventListener('change',()=>{libraryOpen=libraryBreakpoint.matches;const details=document.querySelector<HTMLDetailsElement>('.workspace-library');if(details)details.open=libraryOpen;});
window.addEventListener('pageshow',event=>{if(event.persisted)renderDashboard();});
get('#workspace-content').addEventListener('input',event=>{const input=event.target as HTMLInputElement;if(input.id==='workspace-brand-name'){nameDraft=input.value;get<HTMLElement>('#workspace-name-error').hidden=true;}if(input.id==='workspace-asset-search'){assetQuery=input.value;renderDashboard();}});
get('#workspace-content').addEventListener('submit',event=>{if((event.target as Element).matches('[data-name-editor]')){event.preventDefault();void saveInlineName();}});
get('#workspace-content').addEventListener('keydown',event=>{const key=event as KeyboardEvent;if((event.target as Element).closest('[data-name-editor]')&&key.key==='Escape'&&!key.isComposing){key.preventDefault();key.stopPropagation();cancelNameEdit();}});
get('#workspace-identity-form').addEventListener('submit',event=>{event.preventDefault();void (async()=>{
 const data=new FormData(event.target as HTMLFormElement);let change:Partial<Identity>;
 if(coreKind==='logo')change={logoAssetId:String(data.get('logoAssetId')||'')};
 else if(coreKind==='type')change={fontFamily:String(data.get('fontFamily')||''),fontAssetIds:data.getAll('fontAssetIds').map(String)};
 else change={palette:parsePalette(String(data.get('palette')||''))};
 await serial(async()=>{const settings=marketingWorkspace(state,draftId);await commit(saveMarketingWorkspace(state,{...settings,identity:{...settings.identity,...change}}));});
 closeWorkspaceDialog('#workspace-identity-dialog',`[data-core="${coreKind}"]`);
 })().catch(cause=>showDialogError('[data-identity-error]',cause));});
get('#workspace-identity-form').addEventListener('change',event=>{const input=event.target as HTMLInputElement;if(input.dataset.coreUpload){void addCoreFiles(input.dataset.coreUpload,[...input.files||[]]).catch(cause=>showDialogError('[data-identity-error]',cause));input.value='';}});
get('#workspace-asset-form').addEventListener('submit',event=>{event.preventDefault();const folder=get<HTMLSelectElement>('#asset-folder').value as FolderId;void serial(async()=>{const settings=marketingWorkspace(state,draftId);await commit(saveMarketingWorkspace(state,{...settings,assetFolders:{...settings.assetFolders,[inspectingAsset]:folder}}));}).then(()=>closeWorkspaceDialog('#workspace-asset-dialog',`[data-inspect-asset="${inspectingAsset}"]`)).catch(cause=>showDialogError('[data-asset-error]',cause));});
get('#asset-open-action').addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-download-file]');if(button)void (async()=>{const asset=state.assets.find(a=>a.id===button.dataset.downloadFile),file=filesInMemory.get(button.dataset.downloadFile!)||await store.file(button.dataset.downloadFile!);if(!file)throw Error('The original file is not available in this browser.');download(file,asset?.originalName||file.name);})().catch(cause=>showDialogError('[data-asset-error]',cause));});
get('#questionnaire-body').addEventListener('click',event=>{const target=(event.target as Element).closest<HTMLElement>('[data-questionnaire-step],[data-questionnaire-add-link]');if(target?.dataset.questionnaireStep)void move(target.dataset.questionnaireStep).catch(error);if(target?.hasAttribute('data-questionnaire-add-link'))void addLink().catch(error);});
get('#questionnaire-body').addEventListener('keydown',event=>{const key=event as KeyboardEvent;if(key.key==='Enter'&&(key.target as Element).id==='questionnaire-link'){key.preventDefault();void addLink().catch(error);}});
get('#questionnaire-body').addEventListener('input',event=>{const input=event.target as HTMLTextAreaElement;if(input.dataset.questionnaireAnswer){draft.answers[input.dataset.questionnaireAnswer]=input.value;schedule();progress();}});
get('#questionnaire-body').addEventListener('change',event=>{
 const input=event.target as HTMLInputElement;
 if(input.dataset.questionnaireOrigin){draft.origins[input.dataset.questionnaireOrigin]=input.value;schedule();}
 if(input.hasAttribute('data-questionnaire-files'))void acceptFiles([...input.files||[]]).catch(error);
 if(input.hasAttribute('data-questionnaire-source')){const ids=new Set(draft.sourceIds);input.checked?ids.add(input.value):ids.delete(input.value);draft.sourceIds=[...ids];schedule();}
});
get('#questionnaire-body').addEventListener('dragover',event=>{const e=event as DragEvent;if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});
get('#questionnaire-body').addEventListener('drop',event=>{const e=event as DragEvent;if(e.dataTransfer?.files.length){e.preventDefault();void acceptFiles([...e.dataTransfer.files]).catch(error);}});
get('#questionnaire-back').addEventListener('click',guard(async()=>{
 if(draft.step==='review'){const section=brandQuestionnaireSections.at(-1)!;return move(section.id,section.questions.at(-1)!.id);}
 const i=brandQuestionnaireSections.findIndex(s=>s.id===draft.step),section=brandQuestionnaireSections[i]!;
 const q=section.questions.findIndex(item=>item.id===draft.activeQuestion);if(q>0)return move(section.id,section.questions[q-1]!.id);
 if(i===0)return move('materials');const previous=brandQuestionnaireSections[i-1]!;return move(previous.id,previous.questions.at(-1)!.id);
}));
get('#questionnaire-form').addEventListener('submit',guard(closeDiscovery));
for(const id of ['close-questionnaire','questionnaire-save-close'])get('#'+id).addEventListener('click',guard(closeDiscovery));
dialog.addEventListener('cancel',guard(closeDiscovery));
get('#questionnaire-download').addEventListener('click',guard(async()=>{await flush();const packet=state.world?.brandRoundtableHandoff;if(!brandHandoffIsCurrent(packet,draft))throw Error('Prepare an updated handoff before downloading.');download(new Blob([JSON.stringify(packet,null,2)+'\n'],{type:'application/json'}),'anima-brand-roundtable.json');}));
get('#brand-details-form').addEventListener('submit',guard(async()=>{const data=new FormData(get<HTMLFormElement>('#brand-details-form'));await serial(()=>commit({...state,brand:{...state.brand,name:String(data.get('name')||'').trim(),description:String(data.get('description')||''),website:String(data.get('website')||'')}}));get<HTMLDialogElement>('#brand-details-dialog').close();renderDashboard();get<HTMLButtonElement>('[data-edit-brand]').focus();}));
get('#piece-form').addEventListener('submit',guard(async()=>{const ids=new FormData(get<HTMLFormElement>('#piece-form')).getAll('assets').map(String);await serial(()=>commit(connectPiece(state,pieceId,ids)));get<HTMLDialogElement>('#piece-dialog').close();renderDashboard();if(packageDialog.open&&opener?.isConnected)opener.focus({preventScroll:true});else get<HTMLButtonElement>(`[data-piece="${pieceId}"]`).focus();}));
for(const id of ['workspace-identity-dialog','workspace-asset-dialog'])get<HTMLDialogElement>('#'+id).addEventListener('close',()=>{
 const selector=id==='workspace-identity-dialog'?`[data-core="${coreKind}"]`:`.workspace-resources [data-inspect-asset="${inspectingAsset}"]`;
 const target=document.querySelector<HTMLElement>(selector);
 if(target?.getClientRects().length)target.focus({preventScroll:true});else if(opener?.isConnected&&opener.getClientRects().length)opener.focus({preventScroll:true});else get<HTMLElement>('[data-edit-brand]')?.focus({preventScroll:true});
});
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>{button.closest('dialog')!.close();opener?.focus();}));
window.addEventListener('pagehide',()=>{if(logoURL)URL.revokeObjectURL(logoURL);});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=true;}});
async function init(){
 let loaded:BrandState|undefined;
 try{loaded=await store.load(draftId);}catch{storageReady=false;}
 if(loaded&&loaded.version!==1)throw Error('This workspace uses an unsupported version. Its saved data has not been changed.');
 state=loaded||emptyState();if(!loaded&&introduction)state.brand.name=introduction.organization;
 draft=getBrandQuestionnaire(state);renderDashboard();
 if(!loaded)await commit(state);else message(storageReady?'Draft saved on this browser. Nothing sent.':'Working in this tab.');
 // Legacy onboarding URLs open the workspace too; discovery is now the separate Bento route.
 if(url.searchParams.has('onboarding')){url.searchParams.delete('onboarding');history.replaceState(null,'',url.pathname+url.search+url.hash);}
 document.documentElement.dataset.workspaceReady='true';
 if(location.hash==='#brand-questions')openPackage('all');
 const pinterestResult=url.searchParams.get('pinterest'),pinterestContext=url.searchParams.get('pinterest-context');
 if(pinterestResult){url.searchParams.delete('pinterest');url.searchParams.delete('pinterest-context');history.replaceState(null,'',url.pathname+url.search+url.hash);renderDashboard();
  const context:PinterestContext=pinterestContext==='global'?'global':foundationDefinitions.some(f=>f.id===pinterestContext)?pinterestContext as FoundationId:'library';
  if(context==='global')openPackage('all');else if(context!=='library')openFoundation(context);
  await openPinterest(context,pinterestResult);
 }
}
void init().catch(error);
