import type {WalletPreview} from './embedded-wallet-host.js';
import {escape as e} from './page.js';

// Recovery reviews only the root and its derived public accounts. Castaway
// records are a separate backup; do not infer their presence from core defaults.
export function renderWalletImportReview(preview:WalletPreview):string {
 const accounts=preview.chainAccounts;
 return `<section class="service-panel" aria-labelledby="wallet-review-title"><h2 id="wallet-review-title" tabindex="-1">Review your wallet</h2><p>${preview.restoring?'Restore':'Save'} this Wallet in this browser?</p><h3>${preview.restoring?'Wallet recovery':'New Wallet'}</h3><details open><summary>Wallet public key</summary><p class="wallet-key"><code>${e(preview.publicKey)}</code></p></details>${accounts?`<details><summary>Derived blockchain accounts (${accounts.length})</summary><dl class="wallet-account-list">${accounts.map(account=>`<div><dt>${e(account.networkId)}</dt><dd><code>${e(account.address)}</code></dd></div>`).join('')}</dl></details>`:'<p class="form-note">Reload this review to see the derived blockchain accounts.</p>'}<p class="form-note">These public addresses are derived from your Wallet. Transaction signing is not available here.</p><p class="form-note">Saved account identities, profile and membership proofs are backed up separately in Castaway data. This screen imports the recovery file only.</p><p class="form-note">Importing does not activate memberships, sign you in or connect service access.</p><div class="service-actions"><button class="anima-button" data-tone="light" data-action="confirm">${preview.restoring?'Restore Wallet':'Save Wallet'}</button><button class="anima-button" data-action="cancel">Cancel</button></div></section>`;
}
