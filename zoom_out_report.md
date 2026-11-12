# Stage 5: Initial Zoom Out Review

**Target:** `docs/designs/points_shop_v1.md` (lines 1–1024)
**GoldfishContext:** `docs/prd.md`

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed |
| `egm-inventive-catalyst` | completed |

## egm-zoom-out

**Verdict: Changes requested.** No Blockers, 5 Major, 5 Nit. The context check
passes: the design targets the root problem (no public proof of headless
commerce work). The issues are size and sequencing. The design is too large for
the PRD's budget of about 40 hours, and several parts handle volumes the
success targets never reach.

### Major

| ID | Finding | Scope | Recommendation |
| --- | --- | --- | --- |
| M1 | The in-memory MockBackend implements every points rule a second time, and the contract suite exists only to catch drift between the two copies. A Developer Edition org is free and quick to create. | Decisions table; §8; Alt H; files 68, 76, 96–98 | Build against the real org. If an offline mode is wanted, use a fixture stub that enforces no rules. Drop the parity suite; keep `salesforce.test.ts` as integration. |
| M2 | The email pipeline (Flow → invocable → Queueable → Named Credential → HMAC webhook → Next.js → Resend) is about 10 files for about 1–2 emails a day. It reduces the Flows (the PRD's declarative-automation proof point) to triggers for Apex. Magic links already use a second path. | §6; Alts B and C; files 24–27, 42–43, 47, 54, 74–75, 93 | Next.js sends magic link, welcome and order confirmed (it has the data at checkout). Real Flow Send Email actions send Delivered (and Cancelled), with a fault path. State the volume at which the webhook design becomes worth it. |
| M3 | Writing all 101 files in one session conflicts with the PRD's "each milestone ends deployed". About 50 Salesforce files, including hand-written Flow XML, would never be compiled until first deploy. | Build order; lines 991–1003 | Limit this implementation to milestones 1–2, deployed to a real org. Build Flows in Flow Builder and retrieve them into source. |
| M4 | The riskiest assumption (Agent API context variable mapped to action inputs, client credentials on Developer Edition) is checked in milestone 5. | Open Questions; §7; Build order | Run a one-hour spike in milestone 1 and record the result. |
| M5 | Visitor self-cancel is scope the PRD did not ask for (endpoint, route, button, field, validation rule, email, tests). | Decisions; §3; §4; `Cancelled_By__c` | Keep Piyush-side cancel with idempotent refund; move visitor cancel to Future Improvements. |

### Nit

| ID | Finding | Recommendation |
| --- | --- | --- |
| N1 | Unconfirmed-wallet cleanup job guards storage far from its limit. | Drop it; optionally keep link-token state off `Wallet__c` so wallets are created only on verify. |
| N2 | Rule-based recommendation and `Tags__c` duplicate the language model's job. | One catalogue action returning services, prices and balance; let the agent recommend. |
| N3 | The explore task's server cookie re-check is cosmetic (the browser controls the cookie). | Treat it as honour-style, or say the check is cosmetic. |
| N4 | Speculative pieces: scratch org definition, Lighthouse CI config without CI, `TriggerHandler` bypass. | Defer; or keep the in-repo trigger framework deliberately as interview material and say so. |
| N5 | Field lists and step-by-step algorithms repeat in the Technical Plan and the Detailed Plan. | Keep invariants in the Technical Plan; move formats and steps to the Detailed Plan. |

### Keep as is

The weak points are stated honestly. Only the server talks to Salesforce, and
the wallet comes from the session. `LedgerService` is the only writer, and the
roll-up balance with a validation rule makes the database refuse a negative
balance. Checkout keys make retries safe. Resumes are stored outside Salesforce.

## egm-inventive-catalyst

**Verdict:** False compromises found. 5 Major, 1 Nit. Already solved well: wallet
binding through a server-set context variable, "never negative" enforced in the
database, idempotency keys for double submits.

| ID | Finding | Severity | Proposed resolution | Side effects |
| --- | --- | --- | --- | --- |
| IC1 | Sign-in writes a `Wallet__c` before the email is proven. The rate limit is per email only. About 2,500 requests with random emails fill the 5 MB org, and about 100 use up the shared Resend daily cap for everyone. | Major | Stateless signed token from Next.js; create the wallet only on verify; single use through `Last_Sign_In_At__c` (reject tokens issued before it). A bot challenge (Turnstile) and a cap on magic-link sends across all requests. Removes 4 wallet fields and the cleanup job. | Key rotation makes links already sent invalid; Turnstile affects Lighthouse and privacy; a cap across all requests needs a shared counter (one custom-setting row, or a KV store). |
| IC2 | `Task_Completion__c` duplicates the ledger: two records per earn with the same unique key, in an org already short of storage. The Salesforce contract suite writes undeletable ledger rows into the live org. | Major | Make the earn ledger entry the completion record (add `Earn_Task__c` and `Evidence__c` to the ledger; count limits with an aggregate query). About 30% less storage per visitor, one object fewer. Run contract tests in a scratch org or clean up through the wallet cascade. | Wider ledger rows; limit checks become aggregate queries; deleting evidence for privacy goes through the wallet cascade. |
| IC3 | Email retries run back to back with no delay; in-memory duplicate filtering on serverless makes a duplicate the expected result after a callout timeout; a failed email is lost except for a bell alert. | Major | Pass the event ID to Resend as its idempotency key; retry with growing delays (1, 5, 10 minutes); store a dispatch status field and give Piyush a "Resend email" action or a daily job. | Depends on Resend's idempotency behaviour (confirm first); emails can arrive up to about 15 minutes late; one more field and job. |
| IC4 | The recruiter's two-minute look depends on the Developer Edition org being up. The 10-minute catalogue cache is unspecified and does not survive serverless instances or a long outage. | Major | Render `/`, `/services/[slug]` and `/how-its-built` statically with stale-while-revalidate (keep the last good page when revalidation fails); optionally fall back to the repository's seed catalogue at build time. | Catalogue changes appear only after revalidation; failed revalidation needs logging; the seed copy can drift. |
| IC5 | The mock backend copies every points rule; tests on the mock test the copy, not Apex. | Major | Thin scripted fake: UI state plus canned errors chosen by a seed flag. Apex alone owns the rules; abuse scenarios run only in the Salesforce contract suite against a scratch org. | No local abuse testing without an org; response shapes can still drift (generate types from shared fixtures). |
| IC6 | Three of the four email events start from a Next.js call that already knows it succeeded, yet they go out to Salesforce and back. The design does not say the round trip is kept as a Flow showcase. | Nit | Either say plainly that the Flows are kept as a declarative-automation showcase, or send visitor-originated emails from Next.js straight after a successful response and keep Flows only for Delivered and Piyush's cancels. | The second option weakens the Flow showcase; the first keeps the extra failure points. |

## Cross-reviewer agreement

*   Mock backend duplicates the rules: M1 and IC5.
*   Email pipeline is heavy, and visitor-originated emails need not pass
    through Salesforce: M2 and IC6 (IC3 adds reliability gaps if it is kept).
*   Pending sign-in state should not live on `Wallet__c`, and the cleanup job
    then goes away: N1 and IC1.
