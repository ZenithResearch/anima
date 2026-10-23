// Presentation only: canonical request and prepared-envelope shapes stay SDK-owned.
import type {SavedReview} from './service-review-model.js';
import type {EncryptedOutbox} from './service-encrypted-outbox.js';
import {escape as e} from './page.js';

export function submissionPreflight(review:SavedReview,intakeDigest:string,outbox:EncryptedOutbox|null):string{
 if(review.catalog.schema!=='service.provider-catalog.v4')return '';
 const field=(label:string,value:string)=>`<div><dt>${e(label)}</dt><dd><code>${e(value)}</code></dd></div>`;
 const profile=review.catalog;
 const envelope=(name:string,part:EncryptedOutbox['bundle']['request']|EncryptedOutbox['bundle']['reference'],key:string,validUntil:string)=>
  field(name+' recipient key',key)+field(part?name+' envelope expires':name+' recipient key valid until',part?new Date(part.expires_at_ms).toISOString():validUntil)+(part?field(name+' encrypted envelope SHA-256',part.envelope_digest):'');
 return `<section class="service-panel" aria-label="Submission preflight"><h2>${outbox?'Prepared bundle':'Before Wallet consent'}</h2><dl>${field('Request ID',review.request.request_id)}${field('Idempotency key',review.request.idempotency_key)}${field('Full request SHA-256',intakeDigest)}${field('Brief values SHA-256',review.request.brief.content_hash)}${field('Request destination',profile.intake.endpoint)}${envelope('Request',outbox?.bundle.request??null,profile.intake.envelope.recipient_key_id,profile.intake.envelope.not_after)}${review.request.references.map(ref=>field('Original: '+ref.filename,ref.content_hash)).join('')}${review.request.references.length?field('Original destination',profile.reference_objects.endpoint)+envelope('Original',outbox?.bundle.reference??null,profile.reference_objects.envelope.recipient_key_id,profile.reference_objects.envelope.not_after):''}</dl><p class="form-note">${outbox?'The complete prepared bundle is saved locally. Sending requires another Wallet approval. Retries keep these exact bytes; retention is separate from Service admission.':'Preparation requires receiver authorization and Wallet consent, then seals and saves both envelopes. It does not submit the brief or original. Encrypted envelope digests and expiry appear after preparation.'}</p></section>`;
}
