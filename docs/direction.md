# Accepted direction

Anima by Zenith is a creative network for independent creatives, studios, talent, and commissioning businesses. People can overlap these roles. The client should help them understand the relevant route without forcing an artificial identity split.

The visual character is intimate, calm, aquatic, and quietly alive: aubergine and burgundy water; restrained bioluminescence; reflective materials; ASCII aquatic life beneath content; and distinctive action shapes. Preserve the accepted composition rather than restarting its visual design during extraction.

The landing page introduces the network. The workspace is a concise application: core brand essentials at the top, the asset library beside the work, clear teammate actions, and direct descriptive labels. Separate inputs, brand foundations, and outward deliverables. Show returned work and required decisions only when they exist.

The business journey uses shared brand questions and a shared reference library. Foundation-specific directions and attachments refine that shared context. Questions describe the brand, people, bodily response, emotional response, perceived world, and optional recurring moments. These answers inform a coherent package; separate asset cards are not independent questionnaires.

Use explicit outcomes for actions. Enter Workspace may skip the questions; creating a package requires the applicable shared questions and a reviewed handoff. A local preview, saved draft, prepared envelope, transport receipt, accepted service request, and completed work must each be named accurately.

The component system supports this direction through semantic tokens, native behavior, and reusable parts. The design should remain expressive without making controls obscure, large, noisy, or difficult to use on smaller screens.

## Transport qualification order

Queue-first is the initial pilot only. Complete one real Queue request through
owner Wallet consent, retained delivery, Service admission, mock execution and
verified returned work. Immediately afterward, implement and qualify Matrix-first
service-request delivery with Queue fallback through the supported Wallet Matrix
custody surface. The existing separate Matrix messaging bridge is not that
integration.

Exercise successful Matrix delivery, unavailable-Matrix fallback and uncertain
outcome reconciliation. Both transports must preserve the reviewed brief,
reference association and stable request/idempotency identity, with provider
side deduplication. A processing machine being offline does not itself trigger
fallback after Matrix acknowledges delivery. A successful Queue test does not
complete transport qualification. Owner consent and sending remain manual.

## Current Queue proof and approval boundary

The first proof runs local Anima against the reviewed HTTPS intake gateway,
with encrypted request/reference Queues and an independent response projection.
Anima does not need a public deployment, Wallet Funnel or Tailscale device.
Provider HTTPS publication is a separate operator responsibility.

Zenith Transfer is the preferred macOS consent surface once its bounded
browser-to-native adapter is implemented and qualified. It is currently
unavailable: do not reuse its internal operator bridge or invent a URI scheme.
The browser Wallet remains a user-selected fallback. Never automatically switch
signers, restore a backup, copy a root key or equate a backup with a live signer.
Agent/harness session credentials are outside Anima and do not block this proof.

## Embedded Matrix integration boundary

The single implementation plan is [Wallet core, shared contracts and Matrix](wallet-matrix-plan.md).
It fixes the current org Wallet core as the implementation anchor, keeps Matrix
an optional sibling adapter, assigns producer/consumer ownership, and defers
repository extraction. Anima owns the embedded configuration and relevant-room
UI; Wallet owns protected sessions and approved operations. Existing custody,
recovery, drafts and the Queue pilot remain unchanged.
