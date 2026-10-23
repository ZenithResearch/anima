// App deployment configuration, not a new service or identity contract.
// Populate only from the provider chat's reviewed release handoff. Keep the
// projection base distinct from the intake gateway. No identity is pinned here.
export interface ReviewedProviderConnection {origin:string;baseUrl:string;responseBaseUrl:string;catalogSha256:string;}
export const reviewedProviderConnection:ReviewedProviderConnection|null=null;
