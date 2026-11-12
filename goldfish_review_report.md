# Goldfish Annotated Review Report

**Target:** `docs/designs/points_shop_v1.md` (full file)
**Source findings:** `consolidated_review_report.md` (actions A1–A22) and the five stage reports
**Author decision (2026-11-12):** "Apply all A1–A22" (auto accept)

## Classification

| Action | Severity | AI suggestion | Applied as |
| --- | --- | --- | --- |
| A1 Sign-in writes nothing until verify; Turnstile | Blocker | PROPOSE FIX | §5 Sign-in rewritten: stateless signed token, wallet created at verify, `Last_Token_Issued_At__c` makes tokens single use, Turnstile on three forms. Link fields and cleanup job removed. |
| A2 Record access | Blocker | PROPOSE FIX | §2 sharing table; per-class sharing keywords in §3; agent permission set in §7. |
| A3 API contract | Blocker | PROPOSE FIX | §4 now holds request and response JSON, the error code → HTTP status map, and shared types. |
| A4 Concurrent checkout | Blocker | PROPOSE FIX | §3 checkout locks first; unique `Order_Key__c` and Redeem key per `walletId:checkoutKey:slug`. |
| A5 Email path | Major | PROPOSE FIX (reverses earlier author decision, approved) | §6: Next.js sends magic link, welcome, one order-confirmed email and owner alerts; Flow Send Email actions send Delivered and Cancelled. Webhook pipeline removed. |
| A6 Mock backend | Major | PROPOSE FIX | §8: fixture stub without rules; parity suite and scratch orgs removed. |
| A7 Build scope | Major | PROPOSE FIX | Detailed plan covers milestones 1–2 only, two phases with exit checks; Agentforce test in milestone 1. |
| A8 Drop visitor cancel | Major | PROPOSE FIX | Removed; owner cancel refunds from the Redeem entry. |
| A9 SFCC mapping | Major | PROPOSE FIX | §9 mapping table; "mirrors" claim calibrated. |
| A10 Service, task, order tables | Major | PROPOSE FIX | §2 seed tables and full field types. |
| A11 Validation formulas | Major | PROPOSE FIX | Detailed plan gives every formula and message. |
| A12 Task endpoint and review order | Major | PROPOSE FIX | §3, §4. |
| A13 Cal.com | Major | PROPOSE FIX | §8 and §4 booking endpoint. |
| A14 Resume upload and Origin exemptions | Major | PROPOSE FIX | §8. |
| A15 Concierge | Major | PROPOSE FIX | §7 actions table, server-made keys, fallback, Goal 6 conditional. |
| A16 Goal 2 and `LedgerService` signatures | Major | PROPOSE FIX | Goal 2 reworded; delete-wallet script; full signatures in detailed plan. |
| A17 Next.js details | Major | PROPOSE FIX | §8. |
| A18 Tests | Major | PROPOSE FIX | Detailed plan (Apex) and §8 (storefront test list for milestone 3). |
| A19 Risks & Mitigations | Major | PROPOSE FIX | New H2. |
| A20 Sign-in alternative, revocation | Major | PROPOSE FIX | Alternative I; §5 revocation. |
| A21 Structure | Nit | PROPOSE FIX | Section names, heading levels, rationale-first alternatives, anchors. |
| A22 Style | Nit | PROPOSE FIX | Calibrated claims and consistent terms. |

## Not adopted (per Stage 8 triage)

| Proposal | AI suggestion | Reason |
| --- | --- | --- |
| Per-IP and global rate counters, reserved email quota (D1) | DECLINE | Wallet-at-verify removes the storage attack; Turnstile covers bots; order emails no longer share the Resend quota with Delivered/Cancelled. |
| Webhook retry hardening (IC3, D10) | DECLINE | Webhook removed (A5). |
| Scratch-org contract suite (IC2, IC5) | DECLINE | Apex tests cover abuse cases and roll back their data. |
| Seed-catalogue fallback (IC4) | DECLINE | ISR keeps the last good page. |
| Wallet anonymisation or delete block (D4) | DECLINE | Goal 2 reworded; one delete-wallet script. |
| Cal.com API automation (D5) | DECLINE | Hidden events plus manual cancel; accepted risk. |
| Email normalisation (D6) | DECLINE | Referral cap of 5 stated instead. |
| Agent API streaming (D7) | DECLINE | `maxDuration` plus the milestone 1 test. |
| Per-wallet LLM limits (D8) | DECLINE | Accepted risk pending the test. |
| Storage alert job (D11) | DECLINE | Error mapping plus monthly export. |
| Signed explore cookie (D13) | DECLINE | Explore is honour-system. |
| Message counter (C8, D17) | DECLINE | Limit removed. |
| Merge `Task_Completion__c` into the ledger (IC2) | DECLINE | PRD names the object; storage no longer the driver. |
