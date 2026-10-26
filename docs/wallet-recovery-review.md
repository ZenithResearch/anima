# Recovery review and Castaway data

Anima, iOS and Transfer distinguish the Wallet public key and derived blockchain
accounts from saved account identities. A recovery file restores the root used
to derive the public addresses. Saved identities, profile fields and membership
proofs belong in the separate Castaway data backup.

Anima's recovery review now shows the public key and four derived addresses from
the exact prepared core result. Only account ID, network ID and public address
cross the worker boundary; the confirmation token stays with the worker's pending
transaction. HTML disclosures use the same labels as the native apps. The review
keeps one explicit confirmation, Cancel, keyboard navigation and escaped values.

An older cached preview without the additive public-accounts field still shows
its key and a reload hint rather than inventing an empty account list. Recovery,
encrypted local snapshots and the core 0.4.1 source pin remain unchanged. Existing
0.3.0 records continue to unlock and restore without replacement or migration.

This Anima surface imports and exports recovery files only. It does not acquire
a Castaway import/export editor through this UI change. That limitation is visible
beside the recovery controls; native data import and existing stored descriptors
keep their existing behavior. Membership, authentication, provider trust and
service admission remain separate choices.
