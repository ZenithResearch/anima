# Anima

Anima is a creative network by Zenith. This repository contains its native web client: HTML, TypeScript, CSS, and Rust/WebAssembly. It preserves the calm aubergine pond, animated aquatic life, typography, and Anima component system while separating the application from its earlier design sandbox.

This is an integration candidate. The local workspace and explicitly labelled demonstrations work independently of a live provider. Creating a local Wallet does not create membership, authenticate a service session, or submit a brief.

## Run locally

Use Node.js 20.20 or later and a Rust toolchain with the WebAssembly target installed:

```sh
rustup target add wasm32-unknown-unknown
npm ci
npm run build
npm test
npm run dev
```

Open `http://127.0.0.1:4337/`. The development server serves `dist/`, binds to numeric loopback, and leaves live integrations disabled (Pinterest status reports setup required). Build again after source changes. Set `PORT` to use a different local port; other origins remain unapproved for the provider pilot. Legacy `/brands/packages/anima/production/` bookmarks resolve to these same files without redirecting or moving browser storage.

Useful routes:

- `/`: landing page and brand introduction.
- `/workspace.html`: local brand workspace.
- `/components.html` and `/foundations.html`: working component specimens, semantic tokens, and atomic contracts.
- `/wallet.html`: embedded Castalia local-custody candidate.
- `/workspace-demo.html` and `/service-demo.html`: explicitly marked disposable demonstrations.

## Source map

- `src/`, `templates/`, and `workspace/`: typed controllers, page composition, and compatible local data models.
- `tokens.json`, `atomic.json`, and `ACTION-USAGE.json`: design foundations and component/action conventions.
- `water/` and `scene/`: retained procedural water and aquatic rendering.
- `core/`: Anima's Rust source; the build compiles its WASM rather than copying a previous application binary.
- `wallet-sdk/`: pinned Castalia runtime, source provenance, and its license.
- `provider-contract/`: versioned shared contracts and synthetic examples.
- `tests/`: local behavior and compatibility checks.

Generated HTML, runtime JavaScript, token CSS, and WASM output belong in `dist/`. Edit the authoring source, then rebuild.

## Data and connections

Browser storage is scoped to the exact origin: scheme, hostname, and port. Existing data on another origin is not automatically copied. Keep the original working origin available while reviewing the migration; changing ports does not transfer drafts or Wallet storage.

Requests preserve reviewed material, reference associations, and stable request identity through retries. The checked-in provider examples are fixtures, not active destinations or authority. Live delivery requires separately reviewed endpoint configuration, the supported same-custody Wallet consent adapter, and an end-to-end acceptance test. No deployment is configured by this repository.

See [direction](docs/direction.md), [migration](docs/migration.md), [readiness](docs/readiness.md), and [design-system review](docs/design-system-review.md). Third-party sources and terms are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No project-wide license grant is currently declared.
