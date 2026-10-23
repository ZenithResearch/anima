import type {ArtifactManifest,ProviderCatalog,ProviderService} from './vendor/service-client.js';
export function referenceProfileSummary(catalog:ProviderCatalog,service:ProviderService):string{
 if(catalog.schema!=='service.provider-catalog.v4')return '';
 const types=[...new Set(service.accepted_references.flatMap(r=>r.media_types))].map(type=>type==='image/png'?'PNG':type==='image/jpeg'?'JPEG':type);
 return `Selected originals: up to ${catalog.reference_objects.max_objects_per_request}, ${catalog.reference_objects.max_object_bytes/1024} KiB maximum. Accepted types: ${types.join(', ')||'none'}. Links remain in the brief. No chunking or fallback upload.`;
}
export function referenceProfileIssues(catalog:ProviderCatalog,service:ProviderService,references:ArtifactManifest[]):string[]{
 const issues:string[]=[];
 if(catalog.schema==='service.provider-catalog.v4'&&references.length>catalog.reference_objects.max_objects_per_request)issues.push('This provider accepts at most one selected original. Keep the others in your library and change your selection before continuing.');
 for(const ref of references){const accepted=service.accepted_references.find(r=>r.media_types.includes(ref.media_type));
  if(!accepted)issues.push(ref.filename+': this provider does not accept '+ref.media_type+'. The original stays local.');
  else if(ref.byte_length<1||ref.byte_length>accepted.max_bytes||(catalog.schema==='service.provider-catalog.v4'&&ref.byte_length>catalog.reference_objects.max_object_bytes))issues.push(ref.filename+': this provider accepts originals up to '+Math.min(accepted.max_bytes,catalog.schema==='service.provider-catalog.v4'?catalog.reference_objects.max_object_bytes:accepted.max_bytes)/1024+' KiB. The original stays local.');
 }
 return issues;
}
