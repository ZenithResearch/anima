# Standalone migration

This repository extracts the accepted Anima production client from an earlier shared design sandbox. It starts with a clean public history. The original working source and browser data are retained separately; this extraction is not a destructive move or a data migration.

## Included

- Native source, page templates, shared workspace models, and required procedural scene dependencies.
- Semantic tokens, atomic contracts, component specimens, and action conventions.
- Anima Rust source and pinned Castalia runtime/provenance.
- Synthetic shared-contract examples and behavior tests.
- Font files with their included Open Font License notices.

## Deliberate differences

- Standalone routes replace nested sandbox paths. The root now opens Anima.
- A repository-local build produces `dist/`; the static development server defaults to `http://127.0.0.1:4340/`.
- Public examples describe a generic practice rather than private strategy material.
- Public contact copy uses Anima's address rather than the earlier brand's address.
- Historical review pages, screenshots, internal coordination notes, private local profiles, and locally staged unreleased QA packages are excluded.
- The source schema names and meaningful compatibility fixtures remain intact. A file or field named `credential` is not automatically a secret; real credentials are excluded.

## Storage compatibility

Model compatibility does not move browser storage across origins. IndexedDB and other origin-local stores remain at the scheme, host, and port where they were created. A new local port or a future public host begins with separate storage. Do not promise that reopening the new application automatically recovers existing drafts or an identity.

Preserve the original origin until explicit export/import and recovery paths are reviewed. Castalia's encrypted `.castalia-recovery` file restores signing identity; it does not bundle Anima drafts, reference originals, provider results, membership, or application sessions.

## Connection boundary

The earlier pilot selected `http://127.0.0.1:4337` as an exact browser origin. The new development origin at port 4340 is not implicitly authorized by that selection. A live profile must match the browser origin exactly. HTTPS is the production default; numeric-loopback HTTP is allowed only by an explicitly supported local pilot profile.

Keep three configuration surfaces separate: browser origin, durable encrypted intake gateway, and response projection. No endpoint, cloud account, deployment, or provider authority is installed by this migration.

## Completion checks

Build and test from a clean checkout; inspect landing, workspace, questions, references, review, Wallet, and component specimens at representative viewports. Check long content, keyboard and focus behavior, reduced motion, persistence/reload, unknown submission outcomes, same-request retry, and failed artifact verification. Record failures before promoting this extraction as production-qualified.
