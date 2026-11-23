# Third-party notices

This file records provenance and included terms. It does not grant a project-wide license for Anima-owned code. No root license has been selected.

## Castalia Wallet

The embedded runtime in `wallet-sdk/` is built from [ZenithResearch/castalia-wallet](https://github.com/ZenithResearch/castalia-wallet), revision `06f827483d5637bc29266ac893cf6ac13531d38b` (Core 0.4.1). Its MIT license is included at `wallet-sdk/LICENSE`. Source and artifact hashes, build instructions, and qualification limits are recorded in `wallet-sdk/SOURCE.json`.

Core 0.4.1 also compiles the shared `secs-grant-contract` verifier. Its MIT notice is included at `assets/licenses/secs-grant-contract-LICENSE.txt`; exact source provenance is recorded with the core.

The vendored credential-presentation helper follows the public Castalia source pin and recorded adaptation in `WALLET-SOURCE.json`. Preserve its attribution and patch record when updating it. Local custody support does not imply a released service-consent facade or a security audit.

## Service Management client and contracts

`src/vendor/service-client.ts` and `provider-contract/` are source-pinned shared material from [ZenithResearch/service-management](https://github.com/ZenithResearch/service-management). Exact revisions, Git blobs, hashes, fixture history, and consumer adaptations are recorded in `PROVIDER-CLIENT-SOURCE.json`.

No root upstream license was found in the reviewed source. Do not assume MIT or another redistribution grant from repository visibility. The owner authorized this repository extraction; no additional license grant is implied by that publication.

## secS intake-sealer declarations

`src/vendor/secs-intake-sealer.d.ts` describes the shared producer interface from [ZenithResearch/secS-magik](https://github.com/ZenithResearch/secS-magik). `SEALER-SOURCE.json` records its exact provenance. The locally staged runtime used in earlier QA is not included. Do not infer a license grant for an absent runtime from its interface or testing notes.

## Fonts

The included font binaries are distributed with their SIL Open Font License 1.1 notices:

- Manrope: `assets/fonts/manrope-OFL.txt`.
- Bricolage Grotesque: `assets/fonts/bricolagegrotesque-OFL.txt`.

Keep those notices with redistributed font files. Font names, copyright statements, reserved-name restrictions, and full terms are in the included license files.

## Build tools

TypeScript is a pinned development dependency installed through npm. Its upstream license and dependency metadata accompany the installed package; `node_modules/` is not committed. Rust/Cargo dependencies are resolved by the checked-in lockfile. Review transitive terms when changing dependencies or distributing compiled artifacts.
