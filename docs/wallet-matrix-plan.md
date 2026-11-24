# Wallet core, shared contracts and Matrix: consolidated build plan

Status: coordinated baseline, updated 2026-10-24. This supersedes the
repository-placement alternatives previously discussed. Live Matrix and embedded
consent are not qualified by this plan. No repository extraction is needed for
the first delivery.

## Current priority

Complete the local Anima-to-HTTPS-gateway Queue proof first. Native Zenith
Transfer is preferred but its external browser signing adapter is not yet
implemented; keep it unavailable and require an explicit click for the browser
Wallet fallback. No automatic signer switch, recovery import or identity copy.
A dedicated Wallet Funnel/device is not a prerequisite. The unused pending node
setup was stopped and no new public route was published. Keep provider HTTPS
publication separate from browser Wallet custody.

Matrix remains a later transport; preserve its completed read fixtures and
approval observer, but do not expose an in-flight producer bridge as released.
Codex/Hermes session credential work stays outside Anima.

## Decisions

| Area | Implementation home | Responsibility |
| --- | --- | --- |
| Portable Wallet core | `ZenithResearch/castalia-wallet`, existing core/presentation crates | Member Key custody, RecoverySession, verification and recovery |
| Existing TS presentation/provider-profile contracts | Exact reviewed `bananawalnut/castalia-wallet-auth` source commits | Canonical source for those existing contracts; org copies are pinned mirrors with parity checks |
| New Matrix API and implementation | Optional sibling `crates/castalia-wallet-matrix/` in the org Wallet repo; browser package only as needed | Protected Matrix session/device state, consent-scoped operations, messaging and public projections |
| Product UI | `ZenithResearch/anima` | Embedded configuration, references/message review and relevant-room presentation |
| Service integration | Service Management/Hub producer | Canonical request intake, provider processing, deduplication, receipts, progress, reconciliation and Queue fallback |

The extension, native Wallet and embedded Anima Wallet are client shells over
the portable runtime. Matrix is not part of the pure custody crate. Use upstream
Matrix SDK for protocol/E2EE; do not implement new cryptography or derive Matrix
device keys by reinterpreting the Member Key. A future core/runtime repository
split or wallet-auth transfer is deferred and does not block these steps.

## Preserve current consumers

Anima's current shared-core source pin is
`19ec02f0000f7c59f7341f87ad4c04fd54784fe1`, as recorded in
`WALLET-SOURCE.json`, `wallet-sdk/SOURCE.json` and
`MATRIX-COMPANION-SOURCE.json`. This supersedes the earlier PR #3-only source pin.
The portable custody core is 0.4.1; the Matrix companion read fixture remains
0.2.0. Preserve same-session consent, `castalia.wallet-local.v1`,
`castalia.wallet-custody.v1`, existing recovery files and stored reviews/outbox.
A signing recovery file does not promise Matrix session or history recovery.

Do not edit or consume dirty personal SDK/auth worktrees or uncommitted producer
bridge work. No automatic replacement of a user's identity is allowed.

## Build sequence and ownership

| Slice | Owner | Build | Evidence needed to finish |
| --- | --- | --- | --- |
| 1. Contract parity | Service-delivery chat, Wallet producer changes | Manifest of reviewed auth commit/file hashes; pinned org mirrors; TS/Rust golden and negative vectors for matching contract versions | CI fails on drift; existing bytes and decoders remain compatible |
| 2. Matrix boundary with fixture transport | Service-delivery chat, fresh Wallet worktree | Optional adapter API, protected-store interface and fixture client; closed versioned operations and opaque handles | Secret-surface, scope, consent, cancellation and lifecycle tests pass |
| 3. Anima consumer | Anima chat | Consume producer fixture client; homeserver/account screens, Space/room selection, message/attachment review and supported preference projection | Browser flows use producer contract, preserve drafts and cannot invoke live sending or import provider runtime |
| 4. SDK/persistence spike | Service-delivery chat, Wallet producer changes | Pin upstream SDK/binding and prove browser plus macOS build/storage path; may run alongside slices 2–3 | Protected restart, lock/reload, revoke/account-switch, device trust and encrypted send/receive proven before replacing fixture transport |
| 5. Matrix provider intake | Service-delivery chat | Map typed request envelope to existing canonical intake; reply correlation and attempt reconciliation | One admitted request for duplicate events/retries; verified receipts/status/returned work; no admission claim from Matrix acknowledgement |
| 6. Queue fallback qualification | Service-delivery chat plus Anima consumer tests | Same reviewed request identity/material over either route; Matrix-first with explicit eligible Queue fallback | Queue regression, definitive failure, uncertain result, duplicate-across-routes and provider-offline scenarios pass |

Preserve the completed fixture work in slices 1–3; resume live Matrix adapter
work after the mandatory Queue proof. Slice 3 uses the producer's pinned client;
it does not create another shared schema inside Anima. Existing provisional UI
models are mapped at the boundary, not promoted to canonical types.

The first real Queue pilot is a separate release gate and stays unchanged. It
still requires manual owner consent and one request through receipt, service
admission, labelled mock execution, progress and verified returned work. Matrix
adapter development can proceed while that gate awaits the owner.

## Smallest Matrix capability set

Exact method names/types belong to the Wallet producer, authored once there.

- Public status/subscription: account, homeserver, device/encryption readiness,
  lock/auth/sync state, context and freshness.
- Homeserver discovery and supported account connection through Wallet consent.
  Registration is advertised only if actually supported. Matrix authentication
  is independent of Zenith enrollment/membership and organization authority.
- Paginated Spaces/rooms, validated metadata and timeline updates through
  revocable scoped handles and opaque cursors. Approved join/create operations
  follow in the same contract where supported, not simulated local success.
- Prepare/review/approve/cancel text and encrypted attachment send, with stable
  transaction correlation, trust failures and inspect/reconcile support.
- Reconnect, logout/revoke, account switch and protected persistence lifecycle.
  Recovery distinguishes signing identity, Matrix access and message history.
- Notification preferences only where supported; distinguish local settings
  from homeserver push rules and mark unavailable operations truthfully.

Anima filters relevant rooms using configured Matrix Space membership and/or
validated room-state metadata linked to provider/workspace identifiers. Room
names never establish relevance or authority. The generic library contains no
hardcoded Anima room filter. Conversation attachments do not automatically enter
a reviewed brief: selected originals and their associations must remain explicit.

## Storage and browser approval boundary

Matrix SDK tokens, device secrets, encryption state and recovery material remain
inside Wallet-controlled execution/storage. Anima receives operation handles and
safe projections, never raw bearer tokens, private keys or SDK session objects.
Matrix session revocation must not replace/expose the Member Key. The protected
storage interface is a producer requirement to prove, not an existing generic
vault capability that Anima can assume.

A same-origin worker contains state but does not protect trusted consent from
compromised page JavaScript. Before live embedded approval, qualify a
Wallet-controlled execution/approval boundary, preferably separately originated
or an equivalently reviewed design. Closed message validation, exact
origin/source binding, correlation and revocable scopes are required. Do not
inherit extension/Chrome-owned-approval claims for the embedded candidate.
Member Key/recovery operations and membership issuance require that stronger
approval surface. Apply CSP, Trusted Types where supported, pinned dependencies
and no third-party scripts in Wallet execution. Test wrong origin/room, denied
consent, unverified device, multi-tab access, lock during operations, reload,
account switch, clearing storage and backup/recovery behavior.

## Transport rules

Preserve the canonical IntakeRequest, reviewed brief/original-reference digests,
request ID and idempotency identity across routes and retries. Matrix event and
client transaction identifiers are delivery correlation, not replacement service
identities. Provider ingestion must deduplicate across Matrix and Queue too.

A Matrix acknowledgement is transport evidence, not ServiceRequest admission,
Case creation or completed execution. If the provider machine is offline after
acknowledgement, await processing; do not fallback solely for that reason.
Definitive inability to deliver may permit Queue fallback under the shared
policy. Unknown outcome requires same-request reconciliation; never automatically
mint a new request or blindly resend via another route. Returned progress and
work must be correlated and verified through supported provider projections.

## Current readiness and next handoff

- Existing: pinned Wallet custody/consent candidate, Queue pilot wiring and
  immutable encrypted outbox, shared service SDK, Anima fixture shell.
- Buildable now: parity gate, Matrix fixture API and SDK target/storage spike;
  frontend fixtures can then be replaced by the producer client.
- Not yet proven: generic protected Matrix storage, browser/native SDK path,
  production embedded approval/isolation, real homeserver/device/E2EE lifecycle,
  Matrix provider ingestion and cross-route deduplication.
- Manual owner action: existing Queue Wallet consent and actual test submission;
  later reviewed live Matrix connection/send. No credentials are needed for the
  fixture/API work and no app download or extension is required for Anima.

The service-delivery chat owns the producer release/version, source pins,
examples and test evidence. The Anima chat consumes those artifacts and reports
missing operations instead of guessing. Neither chat changes custody formats,
extracts/transfers repositories, pushes branches or sends a real brief as part of
this planning step.

## First consumer handoff delivered

Producer companion 0.2.0 (now pinned to shared repo commit
`19ec02f0000f7c59f7341f87ad4c04fd54784fe1`)
is integrated in Anima's read-only fixture. Source and example pins are recorded
in `MATRIX-COMPANION-SOURCE.json`. Slice 2 now has app-safe reads, public approval
status and parent Space IDs; slice 3 has read/approval projection adapters and a
Space-based display filter. These are fixture-only progress, not completion of
those slices or qualification of the SDK/custody/transport. Next producer work
is a supported SDK/protected-store implementation and Wallet approval boundary;
Anima will consume those without changing the canonical service intake.
