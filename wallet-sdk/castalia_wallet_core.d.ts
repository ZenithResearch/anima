/* tslint:disable */
/* eslint-disable */

export class WasmCredentialPresentation {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    canonicalRequest(): Uint8Array;
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
    approveCredentialPresentation(prepared: WasmCredentialPresentation, now_seconds: string): string;
    chainAccounts(): string;
    create(passphrase: string, created_at: bigint): string;
    exportRandomized(passphrase: string): string;
    lock(): void;
    mlDsaPublicKey(): string;
    mlDsaPublicKeyCommitment(): string;
    constructor();
    prepareCredentialPresentation(raw: Uint8Array, trusted_pins_json: string, expected_caller_json: string, now_seconds: string): WasmCredentialPresentation;
    publicKey(): string;
    sign(message: Uint8Array): Uint8Array;
    signDreggPq(message: Uint8Array): Uint8Array;
    signFilesServiceAuthentication(challenge: string, origin: string, kind: string, service_id: string, now_ms: bigint): Uint8Array;
    unlock(encoded: Uint8Array, passphrase: string): string;
    unwrapFilesKey(binding: string, envelope: string): Uint8Array;
    wrapFilesKey(binding: string, key: Uint8Array): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmrecoverysession_free: (a: number, b: number) => void;
    readonly __wbg_wasmwallet_free: (a: number, b: number) => void;
    readonly wasmrecoverysession_invoke: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmrecoverysession_new: () => number;
    readonly wasmwallet_chainAccounts: (a: number) => [number, number, number, number];
    readonly wasmwallet_create: (a: number, b: number, c: number, d: bigint) => [number, number, number, number];
    readonly wasmwallet_exportRandomized: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmwallet_lock: (a: number) => void;
    readonly wasmwallet_mlDsaPublicKey: (a: number) => [number, number, number, number];
    readonly wasmwallet_mlDsaPublicKeyCommitment: (a: number) => [number, number, number, number];
    readonly wasmwallet_new: () => number;
    readonly wasmwallet_publicKey: (a: number) => [number, number, number, number];
    readonly wasmwallet_sign: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmwallet_signDreggPq: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmwallet_signFilesServiceAuthentication: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: bigint) => [number, number, number, number];
    readonly wasmwallet_unlock: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly wasmwallet_unwrapFilesKey: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly wasmwallet_wrapFilesKey: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly __wbg_wasmcredentialpresentation_free: (a: number, b: number) => void;
    readonly wasmcredentialpresentation_canonicalRequest: (a: number) => [number, number, number, number];
    readonly wasmcredentialpresentation_dispose: (a: number) => void;
    readonly wasmcredentialpresentation_summary: (a: number) => [number, number, number, number];
    readonly wasmwallet_approveCredentialPresentation: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly wasmwallet_prepareCredentialPresentation: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
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
