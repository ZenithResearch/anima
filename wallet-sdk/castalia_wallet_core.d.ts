/* tslint:disable */
/* eslint-disable */

export class WasmAccessRequest {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    dispose(): void;
    summary(): string;
}

export class WasmCredentialPresentation {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    canonicalRequest(): Uint8Array;
    dispose(): void;
    summary(): string;
}

export class WasmReadAccess {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    dispose(): void;
    summary(): string;
}

/**
 * Worker-owned recovery session. Native and WASM adapters share its state machine.
 */
export class WasmRecoverySession {
    free(): void;
    [Symbol.dispose](): void;
    invoke(request: string): string;
    constructor();
}

export class WasmWallet {
    free(): void;
    [Symbol.dispose](): void;
    acceptReadCredential(access: WasmReadAccess, raw: string, now: string): string;
    approveAccessRequest(request: WasmAccessRequest, now: string): string;
    approveCredentialPresentation(prepared: WasmCredentialPresentation, now_seconds: string): string;
    approveReadAccess(access: WasmReadAccess, now: string): string;
    chainAccounts(): string;
    create(passphrase: string, created_at: bigint): string;
    deriveHolderCredential(stored: string, permissions: string, installation: string, time: string, expires: string): string;
    exportCastaway(value: string, password: string, now: bigint): string;
    exportRandomized(passphrase: string): string;
    importCastaway(value: Uint8Array, password: string): string;
    lock(): void;
    mergeWalletIdentities(current: string, incoming: string): string;
    mlDsaPublicKey(): string;
    mlDsaPublicKeyCommitment(): string;
    constructor();
    openIdentitySection(value: Uint8Array): string;
    prepareAccessRequest(raw: string, installation: string, pins: string, caller: string, now: string): WasmAccessRequest;
    prepareCredentialPresentation(raw: Uint8Array, trusted_pins_json: string, expected_caller_json: string, now_seconds: string): WasmCredentialPresentation;
    prepareReadAccess(raw: string, installation: string, pins_json: string, caller_json: string, now: string): WasmReadAccess;
    presentHolderCredential(stored: string, credential: string, call: string, time: string): string;
    presentReadCall(access: WasmReadAccess, call_json: string, origin: string, now: string): string;
    publicKey(): string;
    reviewHolderDerivation(stored: string, permissions: string, installation: string, time: string, expires: string): string;
    /**
     * The adapter supplies issuer pins from its approved provider store, never the page.
     */
    reviewHolderGrant(raw: string, pins: string, caller: string, installation: string, time: string): string;
    sealIdentitySection(value: string): string;
    sign(message: Uint8Array): Uint8Array;
    signDreggPq(message: Uint8Array): Uint8Array;
    signFilesServiceAuthentication(challenge: string, origin: string, kind: string, service_id: string, now_ms: bigint): Uint8Array;
    unlock(encoded: Uint8Array, passphrase: string): string;
    unwrapFilesKey(binding: string, envelope: string): Uint8Array;
    validateCastawayDescriptors(value: string): string;
    validateHolderGrantBackup(raw: string): string;
    validateWalletIdentities(value: string): string;
    wrapFilesKey(binding: string, key: Uint8Array): string;
}

export class WebWalletCustody {
    free(): void;
    [Symbol.dispose](): void;
    chainAccounts(): string;
    create(password: string, time: bigint): string;
    exportCastaway(value: string, password: string, time: bigint): string;
    exportRandomized(password: string): string;
    importCastaway(value: Uint8Array, password: string): string;
    lock(): void;
    mergeWalletIdentities(current: string, incoming: string): string;
    mlDsaPublicKey(): string;
    mlDsaPublicKeyCommitment(): string;
    constructor();
    openFilesBackup(value: Uint8Array): Uint8Array;
    openIdentitySection(value: Uint8Array): string;
    publicKey(): string;
    recoveryKey(): string;
    restoreFromRecoveryKey(key: string, password: string, time: bigint): string;
    sealFilesBackup(value: Uint8Array): Uint8Array;
    sealIdentitySection(value: string): string;
    signDreggPq(bytes: Uint8Array): Uint8Array;
    signScopedMembershipJoin(scope: string): Uint8Array;
    signZenithMembershipJoin(): Uint8Array;
    unlock(file: Uint8Array, password: string): string;
    validateWalletIdentities(value: string): string;
}

export function servicePresentationContext(pins: string, caller: string, binding: string, now: string): string;

/**
 * Public issuer-signed destination authentication, with no Wallet key access.
 */
export function verifyServiceAccessPoint(pin: string, binding: string, origin: string, at: string): string;

export function wallet_core_version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmrecoverysession_free: (a: number, b: number) => void;
    readonly __wbg_wasmwallet_free: (a: number, b: number) => void;
    readonly wallet_core_version: () => [number, number];
    readonly wasmrecoverysession_invoke: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmrecoverysession_new: () => number;
    readonly wasmwallet_chainAccounts: (a: number) => [number, number, number, number];
    readonly wasmwallet_create: (a: number, b: number, c: number, d: bigint) => [number, number, number, number];
    readonly wasmwallet_exportCastaway: (a: number, b: number, c: number, d: number, e: number, f: bigint) => [number, number, number, number];
    readonly wasmwallet_exportRandomized: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmwallet_importCastaway: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly wasmwallet_lock: (a: number) => void;
    readonly wasmwallet_mergeWalletIdentities: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly wasmwallet_mlDsaPublicKey: (a: number) => [number, number, number, number];
    readonly wasmwallet_mlDsaPublicKeyCommitment: (a: number) => [number, number, number, number];
    readonly wasmwallet_new: () => number;
    readonly wasmwallet_openIdentitySection: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmwallet_publicKey: (a: number) => [number, number, number, number];
    readonly wasmwallet_sealIdentitySection: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmwallet_sign: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmwallet_signDreggPq: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmwallet_signFilesServiceAuthentication: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: bigint) => [number, number, number, number];
    readonly wasmwallet_unlock: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly wasmwallet_unwrapFilesKey: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly wasmwallet_validateCastawayDescriptors: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmwallet_validateWalletIdentities: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmwallet_wrapFilesKey: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly __wbg_wasmaccessrequest_free: (a: number, b: number) => void;
    readonly wasmaccessrequest_dispose: (a: number) => void;
    readonly wasmaccessrequest_summary: (a: number) => [number, number, number, number];
    readonly wasmwallet_approveAccessRequest: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly wasmwallet_prepareAccessRequest: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number, number];
    readonly __wbg_wasmreadaccess_free: (a: number, b: number) => void;
    readonly servicePresentationContext: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
    readonly verifyServiceAccessPoint: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
    readonly wasmreadaccess_dispose: (a: number) => void;
    readonly wasmreadaccess_summary: (a: number) => [number, number, number, number];
    readonly wasmwallet_acceptReadCredential: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly wasmwallet_approveReadAccess: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly wasmwallet_deriveHolderCredential: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number, number, number];
    readonly wasmwallet_prepareReadAccess: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number, number];
    readonly wasmwallet_presentHolderCredential: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number, number];
    readonly wasmwallet_presentReadCall: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
    readonly wasmwallet_reviewHolderDerivation: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number, number, number];
    readonly wasmwallet_reviewHolderGrant: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number, number, number];
    readonly wasmwallet_validateHolderGrantBackup: (a: number, b: number, c: number) => [number, number, number, number];
    readonly __wbg_wasmcredentialpresentation_free: (a: number, b: number) => void;
    readonly __wbg_webwalletcustody_free: (a: number, b: number) => void;
    readonly wasmcredentialpresentation_canonicalRequest: (a: number) => [number, number, number, number];
    readonly wasmcredentialpresentation_dispose: (a: number) => void;
    readonly wasmcredentialpresentation_summary: (a: number) => [number, number, number, number];
    readonly wasmwallet_approveCredentialPresentation: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly wasmwallet_prepareCredentialPresentation: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
    readonly webwalletcustody_chainAccounts: (a: number) => [number, number, number, number];
    readonly webwalletcustody_create: (a: number, b: number, c: number, d: bigint) => [number, number, number, number];
    readonly webwalletcustody_exportCastaway: (a: number, b: number, c: number, d: number, e: number, f: bigint) => [number, number, number, number];
    readonly webwalletcustody_exportRandomized: (a: number, b: number, c: number) => [number, number, number, number];
    readonly webwalletcustody_importCastaway: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly webwalletcustody_lock: (a: number) => void;
    readonly webwalletcustody_mergeWalletIdentities: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly webwalletcustody_mlDsaPublicKey: (a: number) => [number, number, number, number];
    readonly webwalletcustody_mlDsaPublicKeyCommitment: (a: number) => [number, number, number, number];
    readonly webwalletcustody_new: () => number;
    readonly webwalletcustody_openFilesBackup: (a: number, b: number, c: number) => [number, number, number, number];
    readonly webwalletcustody_openIdentitySection: (a: number, b: number, c: number) => [number, number, number, number];
    readonly webwalletcustody_publicKey: (a: number) => [number, number, number, number];
    readonly webwalletcustody_recoveryKey: (a: number) => [number, number, number, number];
    readonly webwalletcustody_restoreFromRecoveryKey: (a: number, b: number, c: number, d: number, e: number, f: bigint) => [number, number, number, number];
    readonly webwalletcustody_sealFilesBackup: (a: number, b: number, c: number) => [number, number, number, number];
    readonly webwalletcustody_sealIdentitySection: (a: number, b: number, c: number) => [number, number, number, number];
    readonly webwalletcustody_signDreggPq: (a: number, b: number, c: number) => [number, number, number, number];
    readonly webwalletcustody_signScopedMembershipJoin: (a: number, b: number, c: number) => [number, number, number, number];
    readonly webwalletcustody_signZenithMembershipJoin: (a: number) => [number, number, number, number];
    readonly webwalletcustody_unlock: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly webwalletcustody_validateWalletIdentities: (a: number, b: number, c: number) => [number, number, number, number];
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
