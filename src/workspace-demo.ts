/** A presentation driver for the actual workspace. All writes use its memory-only demo adapter. */
export {};
const $=<T extends Element=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const frame=$<HTMLIFrameElement>('#workspace-preview'),loading=$<HTMLElement>('#loading');
const doc=()=>frame.contentDocument!;
const el=<T extends Element=HTMLElement>(selector:string)=>{
 const value=doc().querySelector<T>(selector);if(!value)throw Error(`The walkthrough could not find ${selector}.`);return value;
};
const click=(selector:string)=>el<HTMLElement>(selector).click();
const fill=(selector:string,value:string)=>{const input=el<HTMLInputElement|HTMLTextAreaElement>(selector);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};
function until(predicate:()=>boolean):Promise<void>{
 return new Promise((resolve,reject)=>{
  const observer=new MutationObserver(check),poll=window.setInterval(check,80),timer=window.setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(Error('The workspace took too long to respond. Replay to try again.'));},7000);
  function check(){if(predicate()){observer.disconnect();clearInterval(poll);clearTimeout(timer);resolve();}}
  observer.observe(doc(),{subtree:true,childList:true,attributes:true,characterData:true});check();
 });
}
const closed=(selector:string)=>until(()=>!el<HTMLDialogElement>(selector).open);
const open=(selector:string)=>until(()=>el<HTMLDialogElement>(selector).open);
const reveal=(selector:string)=>{const details=el<HTMLDetailsElement>(selector);details.open=true;};
// Native dialog close/focus events run in a later rendering turn. Rebuilding a
// chapter must let those settle before opening and submitting the next dialog.
const settle=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
function spotlight(selector:string){
 doc().querySelectorAll('[data-demo-spot]').forEach(node=>node.removeAttribute('data-demo-spot'));
 const target=el<HTMLElement>(selector);target.setAttribute('data-demo-spot','');target.scrollIntoView({block:'center',behavior:'instant'});
}
interface Chapter{title:string;speaker:string;caption:string;target:string;seconds:number;action:()=>void|Promise<void>}
const chapters:Chapter[]=[
 {title:'Your workspace, clearer.',speaker:'The overview',caption:'The recent refinements focus on a quieter workspace: core assets at the top, the library to the side, and teammates within reach. This is the real UI running with disposable demo data.',target:'.workspace-overview',seconds:9,action:()=>{}},
 {title:'Edit the name, right here.',speaker:'Direct editing',caption:'Click the workspace name to edit it in place. Enter or the checkmark saves; Escape cancels. The small pencil keeps description and website in Brand details. The shared Anima wordmark still takes you Home.',target:'.workspace-overview',seconds:9,action:()=>{click('[data-edit-name]');fill('#workspace-brand-name','Example Studio');}},
 {title:'Bring what you already have.',speaker:'Brand essentials',caption:'Logo, typography and palette stay close at hand. You can upload or select existing assets, or open the package questions when you need to create something.',target:'#workspace-identity-dialog',seconds:8,action:async()=>{click('[data-name-editor] button[type="submit"]');await until(()=>el<HTMLFormElement>('[data-name-editor]').hidden);click('[data-core="logo"]');await open('#workspace-identity-dialog');}},
 {title:'One shared brand brief.',speaker:'Brand questions',caption:'One shared brief informs every foundation. Describe the brand, people, bodily and emotional response, and world. Moments and references are optional. There is no output picker. This example completes the brief so we can add optional foundation direction next.',target:'#workspace-package-dialog',seconds:10,action:async()=>{click('[data-core-package]');await open('#workspace-package-dialog');reveal('[data-brief-question="brand"]');fill('#workspace-answer-brand','A creative network connecting independent practices around shared work.');reveal('[data-brief-question="feeling"]');fill('#workspace-answer-body','A steady breath, with room to pause.');fill('#workspace-answer-emotion','Luminous, expansive, mythic, quietly alive. A feeling of being seen fully.');reveal('[data-brief-question="people"]');fill('#workspace-answer-people','Independent artists building a practice.');reveal('[data-brief-question="world"]');fill('#workspace-answer-world','A calm aubergine pool, seen from above.');el<HTMLDetailsElement>('.brand-moments').open=true;fill('#workspace-answer-signature','The moment a shared idea becomes real.');reveal('[data-brief-question="references"]');click('[data-brief-add-material]');await open('#questionnaire-dialog');reveal('.questionnaire-more-input');fill('#questionnaire-link','https://www.pinterest.com/example/shared-brand/');click('[data-questionnaire-add-link]');await until(()=>doc().querySelectorAll('.questionnaire-source-list label').length===1);click('#questionnaire-save-close');await closed('#questionnaire-dialog');click('[name="briefAsset"]');el<HTMLDetailsElement>('[data-brief-question="references"]').open=false;}},
 {title:'Small controls. Useful assets.',speaker:'Brand essentials',caption:'This example adds an aubergine palette through the existing component. It returns to the core asset cards, rather than adding another large panel to the dashboard.',target:'.identity-strip',seconds:8,action:async()=>{click('[data-close-package]');await closed('#workspace-package-dialog');click('[data-core="palette"]');fill('#identity-palette','#38213B\n#713348\n#B08AAB\n#EEE5F2');click('#workspace-identity-form button[type="submit"]');await closed('#workspace-identity-dialog');}},
 {title:'A shared brief. Specific direction.',speaker:'Foundation direction',caption:'Each foundation can add one note and its own references. This logo board also appears in the library and can be reused for typography or another foundation. Board links work now. The next chapter previews the new Pinterest picker with clearly labeled example boards; live sign-in needs app registration.',target:'#foundation-direction-dialog',seconds:10,action:async()=>{click('[data-foundation="logo"]');await open('#foundation-direction-dialog');fill('#foundation-notes','A fluid, restrained symbol. Avoid literal fish and water droplets.');fill('#foundation-reference-url','https://www.pinterest.com/example/liquid-symbols/');click('[data-foundation-add-link]');await until(()=>Boolean(doc().querySelector('[data-foundation-status]')?.textContent?.startsWith('Reference attached')));}},
 {title:'One board. Several foundations.',speaker:'Pinterest picker',caption:'Choose a board, then attach it to the foundations it should inform. It stays once in the shared library. These are example boards in disposable memory, not a Pinterest login. The live read-only connection is prepared and awaits developer app setup.',target:'#pinterest-picker-dialog',seconds:11,action:async()=>{click('[data-pinterest-open="foundation"]');await open('#pinterest-picker-dialog');await until(()=>Boolean(doc().querySelector<HTMLInputElement>('[data-board="123456789001"]')&&!doc().querySelector<HTMLInputElement>('[data-board="123456789001"]')!.disabled));click('[data-board="123456789001"]');click('[data-board-foundation="123456789001"][value="type"]');}},
 {title:'Invite teammates, directly.',speaker:'Team',caption:'The familiar Juiced entry point is back, using Anima components. Add multiple email addresses together. For now these are invitation drafts; nothing is sent and no access is granted.',target:'#workspace-team-dialog',seconds:8,action:async()=>{click('#pinterest-picker-form button[type="submit"]');await until(()=>Boolean(doc().querySelector('[data-pinterest-notice]')?.textContent?.startsWith('1 board')));click('[data-pinterest-close]');await closed('#pinterest-picker-dialog');click('#foundation-direction-form button[type="submit"]');await closed('#foundation-direction-dialog');click('[data-invite-team]');await open('#workspace-team-dialog');fill('#team-invite-emails','director@example.com, designer@example.com');}},
 {title:'Review before anything is sent.',speaker:'Team',caption:'Saved drafts are counted and can be removed individually. The example removes one address. Drafts remain local in the real workspace; this tour keeps them only in memory.',target:'#workspace-team-dialog',seconds:8,action:async()=>{click('[data-team-submit]');await until(()=>doc().querySelectorAll('[data-remove-invite]').length===2);click('[data-remove-invite="designer@example.com"]');await until(()=>doc().querySelectorAll('[data-remove-invite]').length===1);}},
 {title:'Two ways to find teammates.',speaker:'Discovery',caption:'Find teammates starts with you or your brand: Connect Rolodex, or Use your brand. There is an optional space to describe who you need, without forcing another long form.',target:'#workspace-team-dialog',seconds:8,action:async()=>{click('#workspace-team-dialog [aria-label="Close teammates"]');await closed('#workspace-team-dialog');click('[data-find-teammates]');await open('#workspace-team-dialog');}},
 {title:'Be clear about what is connected.',speaker:'Discovery',caption:'Rolodex has a clear explanation and a route back to the choices. The live profile connection and matching are still pending; the screen does not invent profiles or results.',target:'#workspace-team-dialog',seconds:8,action:()=>{click('[data-find-rolodex]');}},
 {title:'Return to where you started.',speaker:'Navigation',caption:'Use your brand opens the same package questions over the teammate flow. Saved answers are retained. Closing this layer returns to Find teammates, rather than sending you back to the landing page.',target:'#workspace-package-dialog',seconds:9,action:async()=>{click('[data-team-back]');click('[data-find-brand]');await open('#workspace-package-dialog');reveal('[data-brief-question="feeling"]');}},
 {title:'Keep the reference with the work.',speaker:'Inputs & library',caption:'Files and links belong in the asset library. This demo adds an example reference link through the actual References form. The link is stored as a reference; it is not opened or imported from the web.',target:'#questionnaire-dialog',seconds:9,action:async()=>{click('[data-close-package]');await closed('#workspace-package-dialog');click('#workspace-team-dialog [aria-label="Close teammates"]');await closed('#workspace-team-dialog');click('#workspace-inputs [data-open-discovery]');await open('#questionnaire-dialog');reveal('.questionnaire-more-input');fill('#questionnaire-link','https://example.org/brand-reference');const before=doc().querySelectorAll('.questionnaire-source-list label').length;click('[data-questionnaire-add-link]');await until(()=>doc().querySelectorAll('.questionnaire-source-list label').length>before);}},
 {title:'Inputs are not finished deliverables.',speaker:'Workspace structure',caption:'The three layers are inputs, brand foundations and outward deliverables. A reference does not become finished work automatically. The deliverables area stays empty until actual assets are linked to it.',target:'#workspace-outward',seconds:9,action:async()=>{click('#questionnaire-save-close');await closed('#questionnaire-dialog');}},
 {title:'Check the smaller screens, too.',speaker:'Responsive components',caption:'Now showing the phone layout. The library folds away while the core assets and teammate actions remain available. Desktop, Tablet and Phone below let you compare the same UI at any chapter.',target:'.workspace-team',seconds:8,action:()=>{chooseSize('phone');}},
 {title:'Review the shared brief.',speaker:'Brief handoff',caption:'Anima collects your shared answers and references for handoff. Your separate service owns how the work is made. Zenith connections open separately in the real workspace. This walkthrough never connects a wallet, signs in, or sends material.',target:'#workspace-package-dialog',seconds:10,action:async()=>{chooseSize('desktop');click('[data-review-brief]');await open('#workspace-package-dialog');}}
];
let index=-1,playing=false,busy=false,failed=false,timer=0,pace=1,size='desktop';
let actionLabel='Opening workspace';
const play=$<HTMLButtonElement>('#play'),previous=$<HTMLButtonElement>('#previous'),next=$<HTMLButtonElement>('#next');
function fit(){
 const stage=$<HTMLElement>('#stage'),box=stage.getBoundingClientRect();
 const minimumHeight=frame.contentDocument?.querySelector('#foundation-direction-dialog[open],#pinterest-picker-dialog[open]')?680:frame.contentDocument?.querySelector('dialog[open]')?560:420;
 const [width,height]=size==='phone'?[390,844]:size==='tablet'?[820,1000]:[Math.max(1024,Math.min(1440,box.width-40)),Math.max(minimumHeight,Math.min(900,box.height-30))];
 const scale=Math.min(1,(box.width-24)/width!,(box.height-30)/height!);
 const viewport=$<HTMLElement>('#viewport');Object.assign(viewport.style,{width:`${width}px`,height:`${height}px`,transform:`scale(${scale})`,left:`${(box.width-width!*scale)/2}px`,top:`${Math.max(6,(box.height-height!*scale)/2-5)}px`});
}
function controls(){
 play.textContent=playing?'Pause':index===chapters.length-1?'Replay':'Play walkthrough';
 play.disabled=busy;previous.disabled=busy||index<=0;next.disabled=busy||index>=chapters.length-1;
 $('#replay').toggleAttribute('disabled',busy);
 document.documentElement.dataset.tourState=busy?'preparing':playing?'playing':index===chapters.length-1?'complete':'paused';
 $('#tour-status').textContent=busy?'Preparing this chapter…':index===chapters.length-1?'Tour complete · your saved workspace is untouched':`${playing?'Playing':'Paused'} · demo only · nothing sent`;
 $('#chapter-count').textContent=`${String(index+1).padStart(2,'0')} / ${chapters.length}`;
 for(const [i,button] of [...document.querySelectorAll<HTMLButtonElement>('[data-chapter]')].entries()){
  button.disabled=busy;button.toggleAttribute('aria-current',i===index);if(i===index)button.setAttribute('aria-current','step');button.dataset.visited=String(i<index);
 }
}
function stop(){playing=false;clearTimeout(timer);controls();}
function schedule(){clearTimeout(timer);if(!playing||busy)return;if(index===chapters.length-1){stop();return;}timer=window.setTimeout(()=>void go(index+1),chapters[index]!.seconds*1000*pace);}
async function loadWorkspace(){
 loading.hidden=false;
 await new Promise<void>((resolve,reject)=>{
  const timeout=window.setTimeout(()=>{frame.removeEventListener('load',loaded);reject(Error('The demo workspace did not load. Check the local server, then Replay.'));},10000);
  function loaded(){if(!frame.contentDocument?.URL.includes('workspace.html?demo=walkthrough'))return;frame.removeEventListener('load',loaded);clearTimeout(timeout);resolve();}
  frame.addEventListener('load',loaded);frame.src='workspace.html?demo=walkthrough';
 });
 await until(()=>doc().documentElement.dataset.workspaceReady==='true');
 if(doc().documentElement.dataset.workspaceMode!=='demo')throw Error('The disposable demo adapter did not start.');
 const style=doc().createElement('style');style.textContent='[data-demo-spot]{outline:1px solid #cfa8dc77;outline-offset:7px;border-radius:4px}html{scroll-behavior:auto!important}';doc().head.append(style);
 await doc().fonts.ready;
}
async function go(target:number,restart=false){
 if(busy||target<0||target>=chapters.length)return;
 busy=true;clearTimeout(timer);controls();
 try{
  if(index<0||target!==index+1||restart||failed){actionLabel='Opening workspace';await loadWorkspace();for(let i=0;i<target;i++){actionLabel=chapters[i]!.title;await chapters[i]!.action();await settle();}}
  failed=false;
  actionLabel=chapters[target]!.title;await chapters[target]!.action();await settle();index=target;
  const chapter=chapters[index]!;$('#chapter-title').textContent=chapter.title;$('#speaker').textContent=chapter.speaker;$('#caption').textContent=chapter.caption;
  fit();spotlight(chapter.target);loading.hidden=true;busy=false;controls();schedule();
 }catch(cause){busy=false;playing=false;failed=true;loading.hidden=true;controls();document.documentElement.dataset.tourState='error';$('#tour-status').textContent=`${actionLabel}: ${cause instanceof Error?cause.message:'The walkthrough stopped. Replay to try again.'}`;}
}
$('#chapters').replaceChildren(...chapters.map((chapter,i)=>{
 const button=document.createElement('button');button.dataset.chapter=String(i);button.title=`${i+1}. ${chapter.title}`;button.setAttribute('aria-label',button.title);button.addEventListener('click',()=>{stop();void go(i);});return button;
}));
play.addEventListener('click',()=>{if(playing){stop();return;}playing=true;if(index===chapters.length-1||index<0||failed)void go(0,true);else{controls();schedule();}});
previous.addEventListener('click',()=>{stop();void go(index-1);});next.addEventListener('click',()=>{stop();void go(index+1);});
$('#replay').addEventListener('click',()=>{playing=true;void go(0,true);});
$<HTMLSelectElement>('#pace').addEventListener('change',event=>{pace=Number((event.target as HTMLSelectElement).value);schedule();});
function chooseSize(value:string){size=value;for(const option of document.querySelectorAll<HTMLElement>('[data-size]'))option.setAttribute('aria-pressed',String(option.dataset.size===size));fit();}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-size]'))button.addEventListener('click',()=>chooseSize(button.dataset.size!));
window.addEventListener('resize',fit);new ResizeObserver(fit).observe($('#stage'));
window.addEventListener('keydown',event=>{if((event.target as Element).closest('button,select,input,textarea'))return;if(event.key===' '){event.preventDefault();play.click();}if(event.key==='ArrowRight'){event.preventDefault();next.click();}if(event.key==='ArrowLeft'){event.preventDefault();previous.click();}});
// Avoid silently running the presentation while its tab is in the background.
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
fit();void go(0);
