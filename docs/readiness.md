# Readiness

This is a client integration candidate. A successful build and fixture test suite qualify those checks only.

| Area | Current boundary |
| --- | --- |
| Landing and component system | Accepted design extracted; standalone browser regression review remains required. |
| Local workspace | Native drafts, shared questions, original files, and reference associations; origin-local storage is not a server account. |
| Service review | Versioned contracts, immutable review, stable identity, retry/reconciliation, deliverable and receipt views are represented with labelled fixtures. |
| Embedded Wallet | Castalia Rust/WASM local create/restore, unlock/lock, encrypted recovery export, and identity backup verification candidate. This is not a custody security certification. |
| Membership and authorization | Not inferred from local identity or browser storage. No live enrollment or session is enabled. |
| Provider delivery | Reviewed public gateway discovery is wired only for the exact 4337 pilot origin. Its service is preview-only; submission and progress are unconnected. No real brief has been sent. |
| Original-reference encryption | Shared ports and fixture composition retained; the locally staged QA sealer package is excluded. |
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

Remaining gates: supported same-custody Wallet consent, a reviewed sealer runtime, and a separately reviewed response/projection base. Public key and policy pins are covered by the exact catalog digest; discovery cannot replace them.

Discovery qualification: 185 consumer tests pass, including the canonical SDK preview-service rejection. Independent public catalog probes returned 200 for 4337 with the exact catalog SHA-256 and origin header, and 403 for 4340. Browser review confirmed the unauthorized-origin message and local Wallet link. No credential, membership, original reference, brief or submission request was sent by these checks.
