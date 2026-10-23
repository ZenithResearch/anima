import {foundationDefinitions,type FoundationId,type FoundationDirection,workspaceBrief} from './workspace-marketing-model.js';
import type {BrandState} from '../workspace/domain.mjs';
import {isPinterestURL} from './brand-references-model.js';
import {escape as e} from './page.js';
export function foundationReferenceChoices(state:BrandState,direction:FoundationDirection):string{
 const shared=new Set(workspaceBrief(state).assetIds);
 return state.assets.length?state.assets.map(a=>`<label class="asset-choice"><input type="checkbox" name="foundationAsset" value="${e(a.id)}" ${direction.assetIds.includes(a.id)?'checked':''}><span>${e(a.name)}<small>${a.pinterest?'Connected Pinterest board':a.kind==='link'&&a.url&&isPinterestURL(a.url)?'Pinterest reference':a.kind==='file'?'File':'Link'}${shared.has(a.id)?' · shared brand reference':''}</small></span></label>`).join(''):'<p class="form-note">No references yet.</p>';
}
export function foundationDirectionView(state:BrandState,id:FoundationId,direction:FoundationDirection):string{
 const definition=foundationDefinitions.find(f=>f.id===id)!;
 return `<header class="dialog-heading"><h2 id="foundation-direction-title">${e(definition.label)} direction</h2><button type="button" data-close-foundation aria-label="Save and close foundation direction">×</button></header>
 <p class="form-note">Uses your shared brand answers and references. Add only what is specific to ${e(definition.label.toLowerCase())}.</p>
 <label for="foundation-notes">Direction</label><textarea id="foundation-notes" name="foundationNotes" maxlength="4000" rows="3" placeholder="${e(definition.hint)}">${e(direction.notes)}</textarea>
 <fieldset class="foundation-references"><legend>Attach references</legend><div id="foundation-reference-choices">${foundationReferenceChoices(state,direction)}</div></fieldset>
 <div class="foundation-link-row"><label class="sr-only" for="foundation-reference-url">Pinterest board or reference link</label><input id="foundation-reference-url" type="url" placeholder="Pinterest board or reference link" maxlength="2000"><button type="button" data-foundation-add-link>Add link</button></div>
 <label class="workspace-upload">Add files<input type="file" data-foundation-upload multiple aria-label="Add foundation reference files"></label>
 <button type="button" class="workspace-quiet" data-pinterest-open="foundation">Choose Pinterest boards ↗</button>
 <p class="field-error" data-foundation-error role="alert" hidden></p><p class="form-note" data-foundation-status role="status">Optional direction. Nothing sent or generated.</p>
 <footer class="package-brief-actions"><button type="submit" class="primary">Save direction</button></footer>`;
}
