# Readiness

## Consolidated source — 2026-11-24

The merged candidate retains main’s Wallet Core 0.4.1 runtime and provenance at
`19ec02f0000f7c59f7341f87ad4c04fd54784fe1`, including the public-account recovery
review. Both feature branches’ Matrix fixtures, Queue test configuration, and
legacy-custody regression coverage are retained. The October evidence below is
historical; its earlier source pin is superseded by this consolidated baseline.
Live provider consent, delivery and deployment remain separate qualification gates.

This is a client integration candidate. A successful build and fixture test suite qualify those checks only.

| Area | Current boundary |
| --- | --- |
| Landing and component system | Accepted design extracted; standalone browser regression review remains required. |
| Local workspace | Native drafts, shared questions, original files, and reference associations; origin-local storage is not a server account. |
| Service review | Versioned contracts, immutable review, stable identity, retry/reconciliation, deliverable and receipt views are represented with labelled fixtures. |
| Embedded Wallet | Castalia Rust/WASM local create/restore, unlock/lock, encrypted recovery export, and identity backup verification candidate. This is not a custody security certification. |
| Membership and authorization | Never inferred from local identity. Explicit pilot membership and receiver-policy approval are prepared in the embedded worker; no enrollment has been exercised. |
| Provider delivery | Reviewed public gateway discovery is wired only for the exact 4337 pilot origin. Service 1.0.0 and the bootstrap response listener are available. An explicit private test build wires embedded consent/submission; owner approval and full-cycle verification remain pending. No real brief has been sent. |
| Original-reference encryption | Shared ports and fixture composition retained; licensed producer runtime included with source/artifact pins and real request/reference vector tests. |
| Pinterest | Shared reference associations and board-link entry work locally; live sign-in requires a registered application and configured integration. |
| Returned work | Synthetic examples exercise states; no fabricated deliverables populate an empty workspace. |

## Required before live acceptance

1. Review exact origin and endpoint configuration, contract/catalog versions, public recipient pins, and authority roots.
2. Connect the producer-supported consent/presentation adapter to the existing RecoverySession custody. No extension fallback or second signer is substituted.
3. Install and qualify the supported encryption runtime for both request and original-reference envelopes.
4. Exercise explicit consent, encrypted submission, provider durable acceptance, authoritative progress, returned artifacts, receipt references, and verification failures.
5. Verify retries preserve the same request identity and prepared bytes after interrupted or unknown outcomes.

The checked-in v4 examples retain a seven-day maximum for request/reference intake. Transport retention is not permanent storage and does not establish service acceptance. Deployment-specific settings must be reviewed against the active provider contract.

## Frontend qualification

Use `npm run build` and `npm test`, then check the running client. Cover responsive reflow, zoom and long labels; keyboard use and focus return; validation recovery; reduced motion; animated-background contrast; supported browsers and devices; and identity/account changes. Keep observed results separate from tests not yet performed. Historical test counts in provenance files describe their original revisions, not a blanket qualification of this extraction.

## Standalone migration checks

- Clean dependency install and source-built Rust/WASM build passed; 180 native/contract/storage/Wallet regression tests passed.
- Responsive review covered landing at 1440×900, 1024×768, 768×1024, 390×844, 320×568 and 844×390. Question modal, workspace, Wallet and submission preview were checked at small phone widths.
- A compact workspace action inset/wrapping issue was corrected. Service stage navigation now brings the new heading into view, while refreshes retain position.
- `tests/browser/responsive-review.html` is a disposable layout harness with page/viewport controls and a horizontal-overflow readout. Use it for additional manual review, not as an accessibility certification.
- Live integration and recovery consent by the owner remain separate. No owner's Wallet, draft or original files were moved during this extraction.

## Reviewed provider discovery

The public Zenith gateway catalog is hash-pinned and read through the existing canonical SDK. Only the reviewed `http://127.0.0.1:4337` browser origin can attempt discovery. The standalone 4340 preview makes no provider request.

At the initial discovery checkpoint the service declared `availability: "preview"`, `process: null`, and `communication: []`. Both Anima and the shared SDK block requests for that availability. A reachable intake gateway does not imply an available service, published execution, messaging, or a verified progress projection. The provider owner must resolve the availability contract before submission can proceed; Anima does not bypass it.

Remaining gates: producer review of the same-custody consent candidate, exact browser/owner consent qualification, an available service catalog and a separately reviewed response/projection base. Public key and policy pins are covered by the exact catalog digest; discovery cannot replace them.

Discovery qualification: 185 consumer tests pass, including the canonical SDK preview-service rejection. Independent public catalog probes returned 200 for 4337 with the exact catalog SHA-256 and origin header, and 403 for 4340. Browser review confirmed the unauthorized-origin message and local Wallet link. No credential, membership, original reference, brief or submission request was sent by these checks.

## Embedded consent and sealing candidate

The client now includes Castalia Wallet PR 3 at
`0c211d63951daf98a2b71f5e55f1d81bd840c355`. Closed worker operations use the
same RecoverySession for recovery, backup eligibility, pinned membership,
receiver-policy approval and one-shot v2 presentation. Signing trust is held
only in session memory. The encrypted `castalia.wallet-local.v1` and recovery
formats do not change; no extension, second signer or page-supplied root is used.
This source candidate has not received independent custody security review.

The exact secS a6cda6d source was rebuilt with the unchanged lockfile. Its WASM
matches two earlier builds (`f565ef42…`), and both canonical request/reference
vectors pass. MIT license and every distributable hash are included. This is
source qualification of a pilot dependency, not a signed release or a successful
provider submission.

`service-candidate.html` now connects the embedded Wallet to the user's actual
reviewed draft. It does not create a disposable brief or adopt an example
identity. Its reviewed origin, available catalog, separately configured projection
base and explicit action consent remain mandatory. `src/service-connection-config.ts`
is intentionally null until that release handoff is reviewed. The legacy local
profile remains ignored/excluded; it is not used to activate the live connection.

| Gate | State |
| --- | --- |
| Same-session signing producer | Source PR 3 and WASM tests pass; release review pending |
| Request/original encryption | Rebuilt licensed producer included, real vectors pass |
| Embedded UI consent | Implemented; owner has not approved membership or a brief |
| Available service | Published as available 1.0.0; full-cycle readiness is not established |
| Read/progress projection | Bootstrap mount reachable; authenticated request progress/artifact retrieval still untested by the owner |
| Labelled mock execution | Provider-reviewed test binding prepared; actual execution awaits an admitted request and exact Runtime authority |
| Standalone origin | New repo now serves approved 4337 with legacy path aliases; 4340 remains unapproved |
| Real request and provider admission | Not attempted; no successful sending is claimed |

Reviewed app deployment fields (do not substitute intake for the response base):

```json
{
  "origin": "<exact approved browser origin>",
  "baseUrl": "<reviewed gateway origin>",
  "responseBaseUrl": "<separately reviewed HTTPS response base>",
  "catalogSha256": "<digest pinned in this source release>"
}
```

A changed catalog/origin requires updating both discovery and the compiled worker
policy in a reviewed source change; discovery and browser storage cannot install new trust. The same-origin server handoff preserves the existing 4337 draft/Wallet store;
no browser data or recovery file was read or moved.

Current candidate qualification: 192 Anima checks pass, including real pinned-WASM
membership and one-shot presentation tests, sealer vectors/artifact hashes,
unknown-outcome retry coverage and storage continuity. The complete upstream
Wallet Rust workspace, npm tests and typecheck also pass. Browser checks verified
the standalone origin gate and Escape/focus return without unlocking the owner's
Wallet. At that checkpoint the public catalog returned the original preview digest;
no enrollment, credential issuance or real service submission was performed.

The consent dialog can be inspected safely at
`tests/browser/wallet-consent.html` (explicit UI fixture, no Wallet or network).
Wallet origin-gate review at desktop, 390px and 320px showed no horizontal
overflow; Escape returned focus to the initiating action. Populated consent was also checked at 320px; initial focus was moved to the
disclosure heading so the dialog opens at the beginning rather than scrolling
straight to its action buttons. Physical-device and assistive-technology review
remain distinct checks.

## Same-origin standalone handoff

The native Anima server now runs at the existing approved 4337 origin. Root and
legacy Anima paths return byte-identical pages, worker modules and pinned WASM
with correct MIME types. Existing nested bookmarks do not redirect, and browser
storage keeps its original origin. The original source tree is unchanged; only
the local preview listener was replaced. A private local rollback record is kept
outside the repository.

The browser at the new root successfully verified the exact live public catalog
and displayed its preview gate. The provider chat confirmed ownership of the
unfinished Queue pull/admission composition, immutable process pin, catalog
promotion, public read-only projection, finite native authority activation and
cross-member read-denial checks. Its configured projection currently returns 404
and remains unconfigured in Anima. Real sending waits for its explicit ready
handoff and the owner's embedded Wallet consent. No private projection address
or operator authority plan is published here.

## Available catalog handoff — 2026-10-23

Read-only verification returned HTTP 200 with exact `http://127.0.0.1:4337`
CORS and catalog SHA-256
`80b67e2d0c19d334a6227b4a0b42640989d16b71fd66e1a58331e41f6d3cedde`.
The unchanged canonical v4 SDK parses service `zenith.anima.brand-package`
version `1.0.0`, availability `available`, communication `provider-status`, and
process `zenith.anima.brand-package` / `zenith.anima.brand-package-v1` /
`1b4848c714775871a7b1cee4b04d73e43994e30838ec5a312ea10993d0b07ee2`.
Issuer, receiver, recipient, membership-root and caller pins are unchanged.
The historical preview bytes remain a separate compatibility fixture. Existing
reviews retain their original catalog, brief, reference bytes and request IDs;
a release update does not silently upgrade a reviewed or submitted request.

This is catalog qualification only. The provider reports that the response
listener/public mount are not active and the published process is the full
workflow, without an approved labelled mock execution or proven editing handler.
`reviewedProviderConnection` remains null; setup names those gates and cannot
submit. The private deployment address is not included in this public source.
The provider must resolve the response bootstrap and test execution before
manual Wallet consent and a real test request. No automatic fallback to the
intake host, credential approval, authority activation or sending is performed.

## Private transport-test connection — 2026-10-23

The later provider handoff resolves the bootstrap gate. Operator-side read-only
checks returned `/live` 200, `/ready` 503 with only `runtime_authority: false`,
and request-read preflight 204 permitting the exact browser origin. Health
responses do not advertise browser CORS; Anima does not poll these operator
health routes. The bootstrap listener may expose authenticated transport/Service
state before Runtime authority exists; it does not claim a running Case/Run.
The provider reports an owner-reviewed closed test binding for the existing
immutable DAG. All mock artifacts must carry
`ANIMA TRANSPORT TEST - MOCK OUTPUT - NOT BRAND WORK`.
The provider will bind exact Runtime authority after admission supplies the IDs.

Anima supports an explicit build-only connection file with `origin`, `baseUrl`,
`responseBaseUrl`, `catalogSha256`, and `testOnly: true`. It contains addresses
only, never identity, tokens or authority. Use an absolute regular file outside
the repository with mode 0600:

```sh
npm run build -- --provider-connection /absolute/private/anima-connection.json
npm test
npm run dev
```

The build validates the exact reviewed public release, injects the local test
configuration into generated sources, and compiles it. No runtime configuration
is accepted from URL parameters, page messages or browser storage. The private
file is not copied or served; ignored `dist/` contains its browser-visible
addresses and must stay local for this pilot. A plain `npm run build` resets to
the disconnected public default.

Normal workspace/request links now enter embedded Wallet setup. The
`?preview=1` route remains the memory-only fixture, with no provider connection.
Setup preserves the originating draft link, and does not unlock a Wallet,
enroll, approve policy, sign or submit without owner action. Connection metadata
and signing disclosures identify the live transport test and mock output.
Subsequent catalog reads must match the entire reviewed service/process snapshot,
not only the requester keys. Old stored reviews and originals are unchanged.

Still unqualified: the owner's Wallet consent and a real request through Queue
receipt, Service admission, exact-Run mock execution, progress and verified
returned artifacts/receipt references. Listener liveness, source tests and an
available catalog do not establish those outcomes.

Qualification for the opt-in wiring: both the disconnected default and configured
private build pass all 196 automated checks. Browser review confirmed the normal
request entry, the embedded locked-Wallet screen, cancellation, and the separate
memory-only fixture preview. No owner password, membership approval, receiver
policy approval, signing action, request or reference upload was performed.
The private test build is staged locally; no repository push was made.

## Onboarding and communications fixture shell

`connections-fixture.html` is an isolated, in-memory UI study. It reads only the
checked-in canonical request/catalog fixtures; it never reads owner drafts,
Wallet storage, credentials or the private provider configuration. It provides
member/organization/operating-profile examples, provider descriptions, Matrix
connection/sync states, conversations, timeline, example attachment, local message
preview and a fixed canonical service-request preview. No message is appended as
sent when a draft is previewed.

Thirteen scenarios include missing/locked/pending membership, denied organization
access, connecting/syncing/offline/error/empty conversations, Matrix acknowledged
with provider pending, Queue fallback offered and unknown outcome requiring
reconciliation. Real account, Matrix connection/send, Wallet consent, fallback,
reconciliation and service-request actions are natively disabled. Local profile
preferences never change authority; all selections disappear on reload.

`connections-fixture-model.ts` exposes provisional internal view models and a
replaceable in-memory preview client. These are not canonical producer contracts.
The service request stays in its existing `service.intake.v1` shape, with stable
request/idempotency IDs; preview interactions cannot mutate the source fixture or
owner outbox. Existing exact-key SDK, custody and receipt formats are unchanged.
Backend reconciliation still needs the versioned onboarding snapshot, supported
Wallet communications capability, Matrix-to-intake mapping, route-attempt and
reconciliation companion projection, and browser-safe provider readiness.

The private Queue pilot is preserved and remains the first live acceptance gate.
This shell does not establish Matrix delivery, fallback or service execution.

Fixture-shell qualification: TypeScript no-emit check, private configured build
and all 200 checks pass. Browser review exercised draft preview, Matrix
acknowledgement/provider-pending, fallback offered and unknown/reconciliation
states. Layout reflowed with zero horizontal overflow at 1280px, 768px, 390px
and 320px; keyboard composer focus and state-selector focus return were checked.
The temporary viewport override was reset. Physical-device, assistive-technology
and live Matrix qualification are still pending. No repository push was made.

## Matrix implementation handoff

The consolidated sequence, code ownership, compatibility requirements and
acceptance evidence are in [Wallet core, shared contracts and Matrix](wallet-matrix-plan.md).
Earlier repository-placement alternatives are superseded by that plan: build
from the current org core without a prerequisite repository extraction.

The existing fixture qualification above does not cover Matrix configuration,
portable room filtering/creation, notification settings, a protected Matrix
store or live SDK/approval/delivery. These remain planned. No contract schema,
custody format, live connection or production-readiness claim was added by the
consolidation. The private Queue pilot remains the first manual acceptance gate.

## Shared Wallet Matrix companion consumer

Anima pins `@castalia-wallet/matrix-companion` 0.2.0 at public producer commit
`06f827483d5637bc29266ac893cf6ac13531d38b`, alongside embedded Core 0.4.1.
See `MATRIX-COMPANION-SOURCE.json` for exact source/fixture hashes. The local
attribution header is the only patch; upstream already contains the strict
TypeScript assertions. Tests reconstruct the exact upstream bytes.
No upstream runtime behavior was changed. No repository push was performed.

The connections fixture imports only the producer's app-safe read factory.
Anima receives capabilities/status/room pages, not a trusted approvals controller.
The producer bootstrap uses a synthetic in-memory session; it is not encrypted
storage, live authentication or an opened owner Wallet. The new disclosure shows
producer account/Space/room metadata separately from local timeline/layout
studies. Its display filter uses explicit parent Space IDs. Provider authority
is not inferred. Multiple accounts require explicit selection before rooms are
read; paginated reads preserve opaque cursors and reject repeated cursors.

A consumer mapper handles public pending/approved/denied/expired approval
results, including sent/unknown/failed delivery. It creates no ServiceRequest,
Case, authority, receipt or fallback. The read fixture cannot prepare or approve
requests, send messages, reconcile a real delivery, log out an owner or change
storage. All real UI actions remain disabled. Existing drafts, canonical intake,
reference associations and Wallet/recovery formats are unchanged.

Qualification: no-emit TypeScript check, configured build and 207 tests passed.
New tests cover exact provenance, redacted projections, unknown-field rejection,
cursor failure, account separation, Space scoping, approval-result mapping,
HTML escaping and immutable service briefs. Browser review confirmed the shared
metadata and keyboard disclosure; zero horizontal overflow at 1280, 768, 390 and
320px. Temporary viewport override was reset. The private Queue build remains
configured for the exact reviewed local origin with `testOnly: true`.

Still unsupported: live auth/send, timeline/sync, E2EE/device readiness, room
creation, notification mutations, attachments, protected Matrix persistence,
provider intake/deduplication and production embedded approval isolation. The
producer's native SDK compile was incomplete and browser compile not attempted;
this integration does not qualify either SDK target or custody security.

## Embedded Wallet Core 0.4.1 upgrade — 2026-10-26

The embedded core is source-built from the merged public Wallet revision
`06f827483d5637bc29266ac893cf6ac13531d38b` (Core 0.4.1). Core, presentation-helper
and unchanged Matrix-fixture provenance now point to that same revision. Artifact
and source hashes, the prior 0.3.0 artifact inventory, and the new shared verifier's
MIT notice are retained. Anima still uses the same worker-owned RecoverySession
and closed custody/consent adapter; reusable-grant operations are not exposed.

Qualification:

- The exact producer's `cargo test -p castalia-wallet-core --locked` passed
  (50 core/unit/integration tests). The actual WASM was rebuilt with locked
  dependencies and builder path remapping.
- No-emit TypeScript check, private Queue-profile build and all 222 consumer tests
  passed. A clean candidate source copy, without ignored local SDK files or
  profiles, also passed `npm ci`, standalone build and all 222 tests.
- Disposable Core 0.3.0 encrypted snapshot/recovery fixtures prove that existing
  custody unlocks without a speculative identity or rewrite, and old recovery
  restores the same public key. Wrong passwords, modified ciphertext, malformed
  recovery, cancellation and attempted replacement preserve stored state.
- Browser checks used two isolated loopback test origins. Create cancellation,
  explicit save, actual encrypted recovery download/file selection, backup
  verification and restore into the second origin passed. Restoring with a new
  local password retained the exact public identity. Reload locked the session;
  the old local password failed and the new one unlocked that same identity.
  Focus returned to the result notice; no browser console errors were observed.
  At 320px and 768px there was no horizontal overflow; temporary viewport reset.
- The normal 4337 preview serves the pinned 0.4.1 WASM. The existing private Queue
  profile remains configured, `testOnly: true`. A read-only catalog GET returned
  200, the exact pinned digest and the expected origin allowance. Existing Queue
  authorization, encrypted-outbox and stable-retry tests passed.

No owner's Wallet or saved draft was opened, replaced or migrated. No live
Wallet approval, membership enrollment, request submission, Queue receipt,
service execution or returned-work acceptance was performed. Those remain the
separate end-to-end pilot gate; the provider's runtime readiness was not renewed
or asserted by this upgrade.

Compatibility boundary: old snapshots remain readable and ordinary Anima
custody does not add grant records. A snapshot containing newly saved Core 0.4
holder grants must not be reopened or rewritten by an older core. Recovery
files restore the signing identity; they do not include drafts, Matrix sessions
or the separate provider-grant backup.
