# Consolidated Review Report: Points Shop v1

**Target:** `docs/designs/points_shop_v1.md` (1,024 lines)
**Mode:** Consolidated, all five stages, no checkpoints
**Date:** 2026-11-12

| Stage | Report | Reviewers | Blocker / Major / Nit |
| --- | --- | --- | --- |
| 5 Initial Zoom Out | `zoom_out_report.md` | zoom-out, inventive-catalyst | 0 / 10 / 6 |
| 6 Comprehension | `comprehension_report.md` | comprehension | 0 / 7 / 9 |
| 7 Critic | `critic_report.md` | design, structural, style | 1 / 18 / 32 |
| 8 Intermediate Zoom Out | `intermediate_zoom_out_report.md` | zoom-out | 1 / 8 / 6 |
| 9 Implementation Readiness | `implementation_readiness_report.md` | implementation-readiness, codebase-details, style | 5 / 21 / ~25 (after dedupe) |

All 11 reviewer runs completed; none failed.

**Overall verdict:** the design is not ready to implement. The direction holds
(headless Next.js, Salesforce as the system of record, one ledger writer,
database-enforced non-negative balance). Three problems block it: anonymous
sign-in abuse, record access that leaves the integration user and agent
seeing nothing, and a missing API contract. Separately, Stage 8 finds the
design about 20 files larger than a ~40-hour project should carry, and
recommends deleting parts rather than hardening them.

## Consolidated actions

### 🔴 Blocker

| # | Action | Raw findings |
| --- | --- | --- |
| A1 | Sign-in writes nothing to Salesforce until verify: stateless HMAC-signed token from Next.js, wallet created at verify, `Last_Sign_In_At__c` for single use, Turnstile on sign-in, feedback and contact forms. Remove the 4 link fields and the cleanup job. | IC1, N1, D1, B1 |
| A2 | Fix record access: `Service__c` and `Earn_Task__c` Public Read Only; `Points_Ledger__c` ControlledByParent; a `Shop_Agent` permission set; state the sharing keyword per class (concierge classes `without sharing`, filtered by the bound wallet). | C5, D2, R-B3, R-B4, R-B5 |
| A3 | Write the API contract: request and response JSON for each Apex endpoint and Next.js route, plus the error code → HTTP status map. | R-B1 |
| A4 | Close the concurrent checkout hole: lock the wallet before the key check and derive Redeem keys from `checkoutKey:slug`; add a test. | C7, D3, R-B2 |

### 🟡 Major — scope and architecture (author decisions)

| # | Action | Raw findings |
| --- | --- | --- |
| A5 | **Email path:** remove the Flow → Apex → webhook → Resend pipeline. Next.js sends magic link, welcome and one combined order-confirmed email; Flow Send Email actions send Delivered and owner-cancelled emails, with a fault path. Reverses the author's earlier choice. | M2, IC6, IC3, D10, C3, C16, R-M7, R-M15, M-A |
| A6 | **Mock backend:** replace with a thin fixture stub (no rules); drop the parity suite; no scratch orgs. Apex tests own the abuse cases. | M1, IC5, IC2, N4, M-B |
| A7 | **Build scope:** implement milestones 1–2 now (Salesforce foundation, earn and checkout, REST API), with non-overlapping phase file lists and exit checks. Run a 1–2 hour Agentforce test in milestone 1. | M3, M4, M-D, R-M13 |
| A8 | Drop visitor self-cancel; keep owner cancel with refund from the Redeem entry. | M5, N-A, D15 |

### 🟡 Major — correctness and completeness

| # | Action | Raw findings |
| --- | --- | --- |
| A9 | Add the SFCC mapping table; calibrate the "mirrors SCAPI" claim. | C1, ST1 |
| A10 | Add full service and task tables (seed values, verification type, max per wallet, referral cap) and full `Shop_Order__c` field types. | C2, R-M1, R-M6, D6 |
| A11 | Exact validation-rule formulas (status lock that allows reviews, `ISPICKVAL`, Adjustment sign). | R-M2 |
| A12 | Task endpoint accepts only Site, Form, Honour tasks; defined review order with replay. | R-M4, R-M5 |
| A13 | Cal.com: hidden events; server-built link with wallet and order IDs; signature check; webhook ignores bookings without a valid order. | C4, D5, R-M9, M-F |
| A14 | Resume upload: `handleUpload` options, client calls `details`, host and prefix check. Origin-check exemptions listed. | C9, D14, R-M8, R-M10 |
| A15 | Concierge: per-action I/O; one catalogue action instead of rule-based recommend; server-made checkout key; fallback defined; Goal 6 marked conditional; `maxDuration` on the route. | C6, D7, D9, N2, R-M11 |
| A16 | Reword Goal 2 (whole-wallet deletion removes history by design); `LedgerService` full signatures and one exception type. | D4, M-C, R-M3 |
| A17 | Next.js details: `env.ts` guard on `VERCEL_ENV` at request time; checkout key created in the cart route and rotated; ISR `revalidate` on public pages; map storage errors; remove the 5-per-day message limit. | R-M16, R-M17, IC4, D16, D11, C8, D17 |
| A18 | Tests: file-based dev email log; route-level security tests and a bundle grep for secrets; Goal 9 degradation test; concrete governor-limit assertions. | R-M18, R-M20 |
| A19 | Add Risks & Mitigations section holding accepted risks (Cal.com strays, LLM quota, storage, org loss with monthly export, self-referral, employment contract, real usage). | S1, D8, D11, D20, D22, M-H |
| A20 | Add a sign-in alternative and the session revocation story (rotate `SESSION_SECRET`). | D12 |

### 🟢 Nit

| # | Action | Raw findings |
| --- | --- | --- |
| A21 | Structure: promote Additional Resources and Future Improvements to H2; rejection reasons lead with trade-offs; rename sections to the standard; anchor links; move answered open questions. | S2–S9 |
| A22 | Style pass: calibrate claims (goal headings, hiring market, API capacity, recipients), consistent terms ("service" only for offerings), Buy Me a Coffee mentioned, test outcomes stated, pinned versions, full paths. | ST2–ST18, Stage 9 style, Stage 9 nits |

## Rejected or deferred mitigations

Per Stage 8, these proposals are not adopted: per-IP and global rate counters,
reserved email quota, webhook retry hardening (pipeline removed), scratch-org
contract suite, seed-catalogue fallback, wallet anonymisation, Cal.com API
automation, email normalisation, Agent API streaming, per-wallet LLM limits,
storage alert job, signed explore cookie, message counter. Merging
`Task_Completion__c` into the ledger (IC2) is optional.

## Traceability

Every raw finding ID from the five stage reports maps to one action above or
to the rejected list. Stage reports keep the original wording.
