import {BrandReferencesMarkup} from './brand-references.js';
import {brandQuestionFields} from './brand-question-fields.js';
import {brandQuestions,emptyBrandPackage} from './brand-package-model.js';
type ActionRenderer=(props:{label:string;href:string;primary?:boolean;shape?:'silver-tab'|'fold'})=>string;
const e=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const heading=(id:string,kicker:string,title:string,body:string)=>`<header class="business-heading"><p class="eyebrow">${e(kicker)}</p><h2 id="${id}" tabindex="-1">${e(title)}</h2><p>${e(body)}</p></header>`;
export function BusinessFlow(Action:ActionRenderer,arrow:string):string {
 const workspace=()=>Action({label:'Enter Workspace',href:'workspace.html',primary:true,shape:'fold'});
 return `<div class="business-flow">
 <section data-business-screen="business-start" class="business-stage business-entry business-bento" id="business-start" aria-labelledby="business-start-title">
 ${heading('business-start-title','Your brand','Shape your brand package','Tell us about your brand. References, bodily sensations and moments are optional.')}
 <div class="brand-preview-grid">${brandQuestions.map(q=>`<a href="#brand-${q.id}" class="brand-preview-piece" data-brand-question-card="${q.id}"><span class="eyebrow">${e(q.label)}</span><p data-entry-answer="${q.id}">Open to explore</p><span class="brand-piece-edit">Explore ↗</span></a>`).join('')}<div class="brand-preview-piece brand-preview-delivery"><span class="eyebrow">Your brand package</span><p data-brand-completion>0 of 4 required cards complete</p><span class="brand-piece-edit">Free · email optional</span></div></div>
 <div class="business-stage-actions">${workspace()}<anima-surface><button type="button" class="surface-action" data-shape="silver-tab" data-create-brand-package><span class="action-label">Create your brand package</span>${arrow}</button></anima-surface></div>
 <p class="business-small" id="brand-required" data-brand-required role="alert" hidden></p>
 <p class="business-small">Four core cards are required for a package. Enter Workspace skips them.</p></section>
 <section data-business-screen="brand-account" class="business-stage" id="brand-account" hidden aria-labelledby="brand-account-title">
 ${heading('brand-account-title','Your place in Zenith','One account. A world to build.','Create your Zenith account or sign in to keep your workspace and return to your brand package.')}
 <div class="business-entry-copy"><p>Use the same account you use across Zenith. You can add an optional email later for a notification when your package is ready.</p></div>
 <div class="business-stage-actions"><anima-surface><button class="surface-action" data-shape="silver-tab" type="button" data-zenith-account><span class="action-label">Continue with Zenith</span>${arrow}</button></anima-surface>${Action({label:'Review delivery',href:'#brand-delivery'})}</div>
 <p class="business-small" data-account-status role="status">Local design preview. The shared Zenith web account connection is not configured; previewing does not create an account.</p></section>
 ${brandQuestions.map(q=>`<section data-business-screen="brand-${q.id}" class="business-stage${q.id==='references'?' business-references-stage':''}" id="brand-${q.id}" hidden aria-labelledby="brand-${q.id}-title">${heading(`brand-${q.id}-title`,`Your brand / ${q.label}`,q.title,q.prompt)}${q.id==='references'?BrandReferencesMarkup()+`<label for="brand-answer-references" class="brand-answer-label">What matters to you about these? <small>Optional</small></label><textarea id="brand-answer-references" data-brand-answer="references" aria-label="What matters to you about these references?" rows="2" maxlength="4000"></textarea>`:`<p class="business-question-hint business-small">${e(q.hint)}</p>${brandQuestionFields(q.id,emptyBrandPackage())}`}<div class="business-stage-actions">${Action({label:'Back to questions',href:'#business-start',primary:true,shape:'fold'})}</div><p class="business-small">Kept here while you explore. Nothing is sent.</p></section>`).join('')}

 <section data-business-screen="brand-delivery" class="business-stage" id="brand-delivery" hidden aria-labelledby="brand-delivery-title">
 ${heading('brand-delivery-title','Your package / delivery','Here when you return.','Your brand package will take a little time. Come back to your Zenith workspace to find it. Add an email if you’d like to know when it’s ready.')}
 <form class="intro-form business-delivery" data-density="compact" id="business-delivery" novalidate><label for="brand-delivery-email">Email for a notification (optional)<input id="brand-delivery-email" name="deliveryEmail" type="email" autocomplete="email" maxlength="200" placeholder="you@example.com" aria-describedby="brand-email-note"></label><p id="brand-email-note" class="form-note">Leave blank to check back here instead.</p><p data-delivery-error class="field-error" role="alert" hidden></p><div class="business-stage-actions">${Action({label:'Preview in workspace',href:'#brand-workspace'})}<anima-surface><button type="submit" class="surface-action" data-shape="fold" data-tone="depth"><span class="action-label">Review package request</span>${arrow}</button></anima-surface></div></form>
 <p class="business-small" data-delivery-status role="status">Local preview: account connection, hosted generation and email delivery are not live. Nothing is sent.</p></section>
 <section data-business-screen="brand-workspace" class="business-stage business-workspace" id="brand-workspace" hidden aria-labelledby="brand-workspace-title">
 ${heading('brand-workspace-title','Your brand','Shape your brand package','Revisit your answers and references.')}
 <div class="brand-preview-grid">${brandQuestions.map(q=>`<a href="#brand-${q.id}" class="brand-preview-piece"><span class="eyebrow">${e(q.label)}</span><p data-preview-answer="${q.id}">Open to explore</p><span class="brand-piece-edit">Explore ↗</span></a>`).join('')}<div class="brand-preview-piece brand-preview-delivery"><span class="eyebrow">Your brand package</span><p data-package-state>Not requested</p><a href="#brand-delivery">Review delivery ↗</a></div></div>
 <div class="business-workspace-actions"><button type="button" class="surface-link" data-save-brand-preview>Save on this browser ↓</button><button type="button" class="surface-link" data-export-brand-preview>Download your answers ↓</button>${Action({label:'View Brand Package',href:'#brand-package'})}</div>
 <p class="business-small" data-workspace-status role="status">Local workspace preview. No account or package request has been created.</p></section>
 <section data-business-screen="brand-package" class="business-stage business-package-review" id="brand-package" hidden aria-labelledby="brand-package-title">
 ${heading('brand-package-title','Your brand / package preview','Your brand package','Generation is not connected yet. Review the material you’ve shared below.')}
 <div class="brand-package-summary" tabindex="0" role="region" aria-label="Your shared brand material"><dl>${brandQuestions.map(q=>`<div><dt>${e(q.label)}</dt><dd data-package-answer="${q.id}">Left open</dd></div>`).join('')}</dl></div>
 <div class="business-stage-actions">${Action({label:'Edit your starting point',href:'#brand-workspace'})}${Action({label:'Delivery preferences',href:'#brand-delivery'})}</div>
 <p class="business-small">These are your original inputs. No brand assets have been generated or request submitted.</p></section>
 </div>`;
}
