import {readMatrixCompanion} from './matrix-companion-read.js';
import {createFixtureMatrixReadClient} from './vendor/matrix-companion.js';
import {createConnectionsFixture,type ConnectionScenario,type OperatingProfile,type ProviderDescriptor,type ConnectionsPreviewClient} from './connections-fixture-model.js';
import {connectionsFixtureView} from './connections-fixture-view.js';
import {parseProviderCatalog,validateIntake,type IntakeRequest} from './vendor/service-client.js';
import {escape as e} from './page.js';
const root=document.querySelector<HTMLElement>('#connections-preview')!,feedback=document.querySelector<HTMLElement>('#connections-feedback')!;
let client:ConnectionsPreviewClient,body='',attachment=false;
async function render(focus?:string){root.innerHTML=connectionsFixtureView(await client.read(),body,attachment);root.removeAttribute('aria-busy');if(focus)root.querySelector<HTMLElement>(focus)?.focus({preventScroll:true});}
async function act(operation:()=>Promise<void>,note:string,focus?:string){try{await operation();await render(focus);feedback.textContent=note;}catch(error){feedback.textContent=error instanceof Error?error.message:'Example could not be updated.';feedback.focus();}}
root.addEventListener('input',event=>{const input=event.target as HTMLInputElement;if(input.name==='body')body=input.value;if(input.name==='attachment')attachment=input.checked;});
root.addEventListener('change',event=>{const input=event.target as HTMLSelectElement;
 if(input.id==='connection-scenario'){body='';attachment=false;void act(()=>client.scenario(input.value as ConnectionScenario),'Example state changed. No connection or delivery occurred.','#connection-scenario');}
 if(input.id==='provider-description')void act(()=>client.descriptor(input.value as ProviderDescriptor),'Example provider description changed. No identity or access changed.','#provider-description');
 if(input.id==='example-organization'){body='';attachment=false;void act(()=>client.organization(input.value||null),'Example organization changed; the conversation draft was cleared. No account or authority changed.','#example-organization');}
});
root.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button||button.disabled)return;
 if(button.dataset.profile)void act(()=>client.profile(button.dataset.profile as OperatingProfile),'Example operating preference changed. No access rights changed.',`[data-profile="${button.dataset.profile}"]`);
 if(button.dataset.room){body='';attachment=false;void act(()=>client.room(button.dataset.room!),'Example conversation selected.',`[data-room="${button.dataset.room}"]`);}
 if(button.hasAttribute('data-reset')){body='';attachment=false;void act(()=>client.reset(),'Examples reset. Nothing was saved or sent.','[data-reset]');}
 if(button.hasAttribute('data-reconnect'))void act(()=>client.scenario('connecting'),'Previewing a connection attempt only. Use Review state to inspect sync or success.','#connection-scenario');
});
root.addEventListener('submit',event=>{if(!(event.target as Element).matches('#fixture-composer'))return;event.preventDefault();void act(()=>client.previewMessage(body,attachment),'Draft preview only. Nothing sent.','#draft-preview-title');});
async function start(){
 const load=async(name:string)=>{const response=await fetch(new URL('../provider-contract/'+name,import.meta.url),{credentials:'omit',redirect:'error'});if(!response.ok)throw Error('Example material could not be loaded.');return response.json();};
 const [request,catalog]=await Promise.all([load('intake-request.fixture.json'),load('provider-catalog-v4.fixture.json')]);
 validateIntake(request as IntakeRequest,parseProviderCatalog(catalog));const sharedMatrix=await readMatrixCompanion(await createFixtureMatrixReadClient({now:()=>Date.now(),randomId:()=>crypto.randomUUID()}));client=createConnectionsFixture(request as IntakeRequest,sharedMatrix);await render();document.documentElement.dataset.connectionsFixtureReady='true';
}
void start().catch(error=>{root.innerHTML=`<h1>Examples unavailable</h1><p>${e(error instanceof Error?error.message:'Fixture data could not be read.')}</p><p>No accounts, drafts, Wallet state or provider connections were changed.</p>`;root.removeAttribute('aria-busy');});
