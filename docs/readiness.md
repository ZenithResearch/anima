# Readiness

This is a client integration candidate. A successful build and fixture test suite qualify those checks only.

| Area | Current boundary |
| --- | --- |
| Landing and component system | Accepted design extracted; standalone browser regression review remains required. |
| Local workspace | Native drafts, shared questions, original files, and reference associations; origin-local storage is not a server account. |
| Service review | Versioned contracts, immutable review, stable identity, retry/reconciliation, deliverable and receipt views are represented with labelled fixtures. |
| Embedded Wallet | Castalia Rust/WASM local create/restore, unlock/lock, encrypted recovery export, and identity backup verification candidate. This is not a custody security certification. |
| Membership and authorization | Never inferred from local identity. Explicit pilot membership and receiver-policy approval are prepared in the embedded worker; no enrollment has been exercised. |
| Provider delivery | Reviewed public gateway discovery is wired only for the exact 4337 pilot origin. Its service is preview-only; submission and progress are unconnected. No real brief has been sent. |
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

The published service currently declares `availability: "preview"`, `process: null`, and `communication: []`. Both Anima and the shared SDK block requests for that availability. A reachable intake gateway does not imply an available service, published execution, messaging, or a verified progress projection. The provider owner must resolve the availability contract before submission can proceed; Anima does not bypass it.

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
| Available service | Blocked by authoritative `availability: preview` |
| Read/progress projection | Provider handoff and operator approval pending |
| Standalone origin | 4340 remains unapproved; only 4337 is currently pinned |
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
policy in a reviewed source change; discovery and browser storage cannot install new trust. Keep
the existing 4337 draft/Wallet store until a controlled origin handoff is agreed.

Current candidate qualification: 192 Anima checks pass, including real pinned-WASM
membership and one-shot presentation tests, sealer vectors/artifact hashes,
unknown-outcome retry coverage and storage continuity. The complete upstream
Wallet Rust workspace, npm tests and typecheck also pass. Browser checks verified
the standalone origin gate and Escape/focus return without unlocking the owner's
Wallet. The latest public catalog still returns the original preview digest;
no enrollment, credential issuance or real service submission was performed.

The consent dialog can be inspected safely at
`tests/browser/wallet-consent.html` (explicit UI fixture, no Wallet or network).
Wallet origin-gate review at desktop, 390px and 320px showed no horizontal
overflow; Escape returned focus to the initiating action. Populated consent was also checked at 320px; initial focus was moved to the
disclosure heading so the dialog opens at the beginning rather than scrolling
straight to its action buttons. Physical-device and assistive-technology review
remain distinct checks.
