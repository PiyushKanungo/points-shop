# Stage 8: Intermediate Zoom Out Review

**Target:** `docs/designs/points_shop_v1.md` (lines 1–1024)
**Context:** `docs/prd.md`, `zoom_out_report.md`, `comprehension_report.md`, `critic_report.md`

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed — 1 Blocker, 8 Major, 6 Nit |

**Verdict: Changes requested.** The three earlier reports raise about 80
findings. If every proposed fix were adopted, the design would grow. About a
third of the fixes harden parts that other findings say to delete, and another
third add infrastructure for attacks and volumes a shop aiming at 50 sign-ups
and 10 orders will not meet. Apply deletions first, then cheap correctness
fixes, and record the rest as accepted risks in a new Risks section.

## Findings

| ID | Severity | Finding | Recommendation |
| --- | --- | --- | --- |
| B1 | Blocker | Sign-in abuse (D1, IC1, N1) must be fixed, but D1 bundles five mitigations, two of which need a shared counter. | Stateless signed token from Next.js; wallet created only at verify; `Last_Sign_In_At__c` for single use; Turnstile on `/signin`, feedback and contact. Reject per-IP limits, the global counter and the reserved quota. Removes 4 wallet fields and the cleanup job. |
| M-A | Major | Conflict: M2/IC6 delete the email webhook; IC3/D10 harden it. C3 and C16 are flaws of the same pipeline. | Next.js sends magic link, welcome and one combined order-confirmed email per checkout; real Flow Send Email actions send Delivered and Piyush-side Cancelled, with a fault path. Reject IC3 and D10. State the volume at which a webhook becomes worth it. |
| M-B | Major | The mock should not copy the rules (M1, IC5), but the replacements conflict (scratch orgs vs N4). Apex tests already cover abuse and roll back their data. | Thin fixture stub (canned data and errors). Delete the shared scenarios and mock contract test; shrink `salesforce.test.ts` to a smoke test or drop it. No scratch orgs. |
| M-C | Major | Conflict: D4 (anonymise or block wallet delete) vs IC2 cascade cleanup vs the privacy promise. | No code. Reword Goal 2: entries cannot be edited or deleted one at a time; deleting a whole wallet for a privacy request removes its history by design. |
| M-D | Major | Writing all milestones at once contradicts the PRD; several questions (D7, D8, D22, C6/D9) need a real org. | Limit implementation to milestones 1–2. Run a 1–2 hour Agentforce spike in milestone 1 (context-variable mapping, requests per message, latency, storage). Reject streaming; set `maxDuration`. |
| M-E | Major | Cheap correctness fixes: sharing (C5/D2), concurrent checkout (C7/D3), concierge checkout key (C6/D9), Cal.com webhook path (C4). | Adopt all four: catalogue Public Read Only plus an agent permission set; lock before the key check or key Redeem entries by `checkoutKey:slug`; server-made concierge key; one server-to-server booking endpoint. |
| M-F | Major | Cal.com API automation (D5) is out of proportion. | Hidden event types; the webhook ignores bookings without a valid Awaiting Details booking order; Piyush cancels strays by hand. Accepted risk. |
| M-G | Major | Storage alert job and archive plan (D11) are out of proportion once wallets are created only at verify (about 1–1.5 MB at 50 sign-ups). | Map `STORAGE_LIMIT_EXCEEDED` to the unavailable message; Data Export schedule or monthly `sf data export`. IC2 becomes optional. |
| M-H | Major | Per-wallet LLM counters (D8) need persistent storage. | Accept the risk; revisit after the spike measures requests per message. |
| N-A | Nit | Agreed Stage 5 simplifications. | Drop visitor cancel; one catalogue action instead of rule-based recommendation; explore is honour-system; Next.js ISR `revalidate` on public pages (no seed fallback). |
| N-B | Nit | Email normalisation (D6) would merge `+contract-` test wallets and is new logic for a 100-point reward. | State the referral cap; do not normalise. |
| N-C | Nit | The 5-per-day message counter (C8, D17) needs storage. | Remove the limit; the task limit plus Turnstile covers it. |
| N-D | Nit | Cheap hardening. | Keep D14 (check `resumeUrl`), D18 (new key when cart changes), D19 (`Referrer-Policy`), D15 (refund from the Redeem entry). |
| N-E | Nit | Document fixes. | C1 (SFCC mapping) and C2 (service and task tables) first; Risks section holds accepted items; short sign-in alternative; one editing pass for structure and style nits. |
| N-F | Nit | Leftover speculation. | Drop the scratch-org definition; Lighthouse stays a manual check, stated in Goal 8. |

## Rejected or simplified mitigations

| Report ID | Proposed addition | Disposition |
| --- | --- | --- |
| D1 | Per-IP limit, global counter, reserved quota | Reject; stateless token + Turnstile |
| IC3, D10 | Retry delays, idempotency, status field, resend action | Reject; pipeline removed |
| IC5, IC2 | Scratch-org contract suite | Reject; Apex tests cover abuse |
| IC4 | Seed-catalogue fallback | Reject; ISR only |
| D4 | Anonymisation or delete block | Reject; reword Goal 2 |
| D5 | Single-use links or Cal.com API cancel | Simplify; hidden event + manual |
| D6 | Email normalisation | Reject; state referral cap |
| D7 | Streaming | Reject; `maxDuration` + spike |
| D8 | Per-wallet LLM limits | Accept risk pending spike |
| D11 | Storage alert job, archive plan | Reject; error mapping + manual export |
| D13 | Signed explore cookie | Reject; honour-system |
| C8, D17 | Message counter | Remove the limit |
| IC2 | Merge completions into ledger | Optional |

**Net effect:** about 20 of the 101 planned files go away; about five small
items are added.
