# Design-system review

This review applies Brad Frost's atomic-design framework as an analytical lens. It does not represent his participation, review, or endorsement. Tokens underpin the system; atoms, molecules, organisms, templates, and pages are refined together.

## Preserve and consolidate

| Layer | Existing source | Review rule |
| --- | --- | --- |
| Foundations | `tokens.json`, `token-tools.mjs` | Generate CSS from named primitive, semantic, and component roles. Preserve optical material recipes while consolidating functional styling. |
| Atoms | `atoms.css`, `interactions.css`, native controls | Keep names, focus, hover, disabled, invalid, selected, and loading behavior coherent. Use native controls for native behavior. |
| Molecules | Question fields, reference imports, action compositions | Reuse shared controls; avoid parallel markup and state models for the same intent. |
| Organisms | Shared brief, references, teammate and review surfaces | Compose existing parts, preserve work on close/failure, and return focus contextually. |
| Templates/pages | Landing, workspace, service review, Wallet | Check the whole journey with real-length content, then refine the parts where it exposes problems. |

## Action hierarchy

`ACTION-USAGE.json` records the shape conventions. Entering a task, advancing work, and offering a considered handoff are different intentions; shapes reinforce those promises. They must not permanently label an audience or substitute for clear copy. Keep the distinctive orb where it helps one focal action. Adjacent primary actions need balanced labels, size, spacing, and visual weight.

## Refinement priorities

- Consolidate duplicated borders, control dimensions, spacing, and state colors into semantic/component tokens without changing the accepted appearance.
- Keep field labels and focus indicators unclipped. Ensure compact styling retains usable hit targets.
- Check dialogs with their longest content: close/back placement, scroll containment, validation summaries, keyboard order, and focus return.
- Keep creatures and water behind the content without adding layout rows or obstructing actions. Place them purposefully as breakpoints change.
- Review small-screen CTA placement in the landing, business, closing, and workspace flows. Hierarchy must survive wrapping and zoom.
- Align new Wallet and service surfaces with shared atoms rather than inventing a second application style.

## Evidence required

`atomic.json` defines component contracts and quality policy. Component specimens expose states; they are not proof that every page is qualified. Check 320px reflow, long labels, 200% text zoom, visible keyboard focus, dialog focus return, reduced motion, forced colors, screen-reader behavior, real touch, and contrast over the moving background. Keep failures and untested cases visible in readiness notes.
