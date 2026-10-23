// Read-only deployment preflight. Never connects a Wallet or sends material.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {parseQueueCandidateProfile} from './runtime/service-candidate-provider.js';
import {canonical} from './runtime/service-review-model.js';
import {parseProviderCatalog} from './runtime/vendor/service-client.js';
import {boundedProviderFetch} from './runtime/service-network.js';

export function inspectDeploymentProfile(raw,{origin='http://127.0.0.1:4337',now=Date.now()}={}){
 const profile=parseQueueCandidateProfile(raw);
 if(profile.origin!==origin)throw Error('The profile does not name the reviewed Anima browser origin.');
 for(const name of ['intake','reference_objects']){
  const part=profile.catalog[name],key=part.envelope;
  if(part.max_retention_seconds<60)throw Error('Queue retention must be at least 60 seconds.');
  if(now<Date.parse(key.not_before)||now>=Date.parse(key.not_after))throw Error('The '+name+' recipient key is not currently valid.');
 }
 return {profile,report:{state:'configuration-valid-only',profileSha256:createHash('sha256').update(canonical(profile)).digest('hex'),origin:profile.origin,baseUrl:profile.baseUrl,responseBaseUrl:profile.responseBaseUrl,providerId:profile.catalog.provider.id,serviceIds:profile.catalog.services.map(s=>s.id),member:profile.member,receiver:{endpoint:profile.catalog.requester.credential.endpoint,issuer:profile.catalog.requester.credential.issuer,keyId:profile.catalog.requester.credential.key_id,policyDigest:profile.catalog.requester.credential.policy_digest_sha256},transports:['intake','reference_objects'].map(name=>({name,endpoint:profile.catalog[name].endpoint,recipientKeyId:profile.catalog[name].envelope.recipient_key_id,recipientValidUntil:profile.catalog[name].envelope.not_after,retentionSeconds:profile.catalog[name].max_retention_seconds})),notVerified:['Wallet connection, trust or membership','Gateway acceptance and Queue resource activation','Browser CORS enforcement and manual consent','Local provider admission and authoritative returned work']}};
}

export async function probeDeploymentCatalog(profile,network=fetch){
 const endpoint=profile.baseUrl.replace(/\/$/,'')+'/v1/provider';
 const request=boundedProviderFetch(network,(url,method)=>{if(url!==endpoint||method!=='GET')throw Error('Only the reviewed catalog GET is permitted.');});
 const response=await request(endpoint,{method:'GET',headers:{Accept:'application/json',Origin:profile.origin},credentials:'omit',redirect:'error'});
 if(!response.ok)throw Error('Provider discovery returned HTTP '+response.status+'.');
 if(response.headers.get('access-control-allow-origin')!==profile.origin)throw Error('Provider discovery does not explicitly allow the reviewed Anima origin.');
 const text=await response.text();if(text.length>1024*1024)throw Error('Provider catalog is too large.');
 if(canonical(parseProviderCatalog(JSON.parse(text)))!==canonical(parseProviderCatalog(profile.catalog)))throw Error('The public provider catalog differs from the reviewed profile.');
 return {state:'catalog-matches-reviewed-profile',limits:'Read-only GET only; no Wallet, issuer request, upload, submission or Queue activation performed.'};
}

async function main(){
 const args=process.argv.slice(2),file=args[0]??new URL('tests/local-provider-profile.json',import.meta.url);
 if(args.slice(1).some(a=>a!=='--probe-catalog'))throw Error('Usage: node check-provider-profile.mjs [public-profile.json] [--probe-catalog]');
 const {profile,report}=inspectDeploymentProfile(JSON.parse(await readFile(file,'utf8')));
 if(args.includes('--probe-catalog'))report.discovery=await probeDeploymentCatalog(profile);
 console.log(JSON.stringify(report,null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(JSON.stringify({state:'not-ready',detail:error.code==='ENOENT'?'No reviewed deployment profile is staged.':error.message,nothingSent:true},null,2));process.exitCode=1;});
