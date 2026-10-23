import type {PresentationTrustConfig} from './vendor/wallet-credential-presentation.js';
// Reviewed public pilot policy. Neither discovery, URL parameters, imported
// files nor page messages can replace these issuer keys or caller bindings.
export const embeddedWalletProfile={
 origin:'http://127.0.0.1:4337',
 issuerOrigin:'https://zenith-membership-issuer.vercel.app',
 issuerId:'zenith-research',membershipKeyId:'zenith-membership-pilot-2026-10-22',
 membershipPublicKey:'c739e911a0448c9e7095b163ff8458da81a0360f1812264e345efdc3a3a5ef2b',
 receiverIssuer:'zenith-provider-intake',receiverKeyId:'anima-pilot-2026-10-22',
 receiverPublicKey:'7def52cc980337faa80a6b91bbd0c38ba6a1e15096ca1f1549b1a7498d70b393',
 audience:'zenith-service-management',
} as const;
export function requireEmbeddedOrigin(actual:string){if(actual!==embeddedWalletProfile.origin)throw Error('The reviewed provider connection is approved only for '+embeddedWalletProfile.origin+'. Your local Wallet is still available here.');}
export function embeddedMembershipTrust(){const p=embeddedWalletProfile;return {v3:{schema:'castalia.zenith-membership-trust-policy.v1',version:1,roots:[{issuerId:p.issuerId,keyId:p.membershipKeyId,signatureSuite:'Ed25519',publicKey:p.membershipPublicKey}]}};}
export function embeddedPresentationTrust(actual:string):PresentationTrustConfig{
 requireEmbeddedOrigin(actual);const p=embeddedWalletProfile,caller={kind:'browser' as const,id:p.origin};
 return {schema:'castalia.wallet-presentation-trust.v1',caller,pins:[{issuer:p.receiverIssuer,key_id:p.receiverKeyId,public_key:p.receiverPublicKey,audience:p.audience,callers:[caller]}]};
}
