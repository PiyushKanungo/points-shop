# Stage 9: Implementation Readiness Test

**Target:** `docs/designs/points_shop_v1.md` (DetailedRange, lines 646–1024)
**Standard:** implementation-readiness-standard (readiness, codebase details); style persona only

## Reviewer Status

| Reviewer | Status | Result |
| --- | --- | --- |
| `egm-implementation-readiness` | completed | 3 Blocker, 14 Major, 8 Nit — not ready (fails the Zero-Decision Rule) |
| `egm-codebase-details` | completed | 3 Blocker, 12 Major, 7 Nit — not ready |
| `egm-style` | completed | 0 Blocker, 5 Major, 10 Nit |

## Blockers (deduplicated)

| ID | Finding | Source | Recommendation |
| --- | --- | --- | --- |
| R-B1 | No JSON contract: response bodies, property names and types for every Apex REST endpoint and Next.js `/api/*` route are missing; `ShopException` code → HTTP status map not given. The same contract must be written in Apex DTOs and TS types. | IR B1 | Contract table per endpoint (request, response, status map); `types.ts` transcribes it. |
| R-B2 | Concurrent checkout with the same key creates two order sets (check before lock; no unique key). Sequential test would pass anyway. | IR B2 (also C7, D3) | Lock first, or Redeem key `redeem:<checkoutKey>:<slug>`; state the step order. |
| R-B3 | Catalogue invisible to the integration user (Private OWD + `with sharing`, admin-owned seed rows, no View All). | CD B1 (also D2) | `Service__c`, `Earn_Task__c` Public Read Only or View All; state sharing keyword per class including async and agent-run classes. |
| R-B4 | Agent user has no permission set and no record visibility; Goal 6 cannot pass. | IR B3, CD B2 (also C5) | `Shop_Agent` permission set; `without sharing` concierge classes filtered by bound `walletId`, or View All; assignment step in setup doc. |
| R-B5 | `Points_Ledger__c` (detail) cannot be Private; deploy fails. | CD B3, IR M1 | `ControlledByParent`; state delete constraint (Restrict) for required lookups. |

## Major (deduplicated)

| ID | Finding | Source | Recommendation |
| --- | --- | --- | --- |
| R-M1 | `Shop_Order__c` field types, lengths, defaults, picklists not given; some other fields untyped; required lookups need Restrict. | IR M2, CD M6 | Full field list like items 13–17; `Review_Rating_Range` rule. |
| R-M2 | Validation formulas missing; `Terminal_Status_Locked` as worded blocks reviews; `Cancelled_By__c = 'Visitor'` will not compile (needs `ISPICKVAL`); Adjustment sign unstated; how `LedgerService` recognises `Balance_Not_Negative`. | IR M3, CD M5 | Exact formula and message per rule. |
| R-M3 | `LedgerService` signatures incomplete (`postAll`, `relatedIds`); exception names conflict with single `ShopException`. | IR M4 | Full signatures (`Posting` inner class); one exception type. |
| R-M4 | Nothing stops `POST /tasks/referral`, `/review`, `/signup` from the API. | IR M5 | Task endpoint accepts only Site, Form, Honour tasks; tests. |
| R-M5 | Review flow: save-then-complete conflicts with the check; replay rejected. | IR M6 | Defined order in one transaction; replay returns success. |
| R-M6 | Seed data incomplete (keys, verification, max per wallet, tags, booking URLs); "eight plus signup" miscounts; booking validation blocks import. | IR M7, CD M7 | Seed table with every field; placeholder booking URLs. |
| R-M7 | Email webhook format undefined (schema, recipient address, HMAC string, retry delay, notification recipient); one Queueable per event breaks bulk/async limits; chained enqueue fails in tests; "3 attempts" vs "3 retries". | IR M8, CD M3, CD M4 | Moot if the webhook is removed (Stage 8 M-A); otherwise specify all. |
| R-M8 | Webhooks and Blob upload callback fail the Origin check. | IR M9, CD M10 | List exempt routes (signature-authenticated). |
| R-M9 | Cal.com webhook has no API path (wallet-scoped endpoints; no lookup); metadata editable by the visitor; signature header unstated. | IR M10, CD M9 | Server builds link with `walletId` + `orderId`; ownership checked in Apex; `X-Cal-Signature-256`. |
| R-M10 | Resume URL linking and validation undefined; `handleUpload` options unspecified. | IR M11, CD M10 | Client calls `details` with the URL; host and prefix check; `allowedContentTypes`, size, `addRandomSuffix`, `clientPayload`. |
| R-M11 | Concierge action I/O, recommend algorithm, server-side `checkoutKey`, fallback signatures, Agent API sequence and env vars, session expiry undefined. | IR M12 (also C6, D9) | Per-action I/O table; server- or Apex-made key; Agent API sequence. |
| R-M12 | Message limit and catalogue cache have no mechanism. | IR M13 | Remove the limit (Stage 8 N-C); ISR `revalidate` for the catalogue. |
| R-M13 | Build phases overlap (files 42–44, 76, 84, 91–94, 101 in two milestones; 1–7 unscheduled); no exit check per phase; "in this session" sentence. | IR M14, ST 1–2 | Non-overlapping file lists with exit checks; restate without session wording. |
| R-M14 | `notificationtypes/` is the right folder; notification needs a user ID. | CD M1 | Fix path; `Owner_User_Id__c` or query by email. |
| R-M15 | Named Credential format unspecified; redeploy overwrites URL; External Credential principal access for Automated Process user. | CD M2 | Moot if webhook removed; otherwise choose format and list files. |
| R-M16 | `env.ts` production guard breaks `next build` and local Lighthouse (`NODE_ENV=production` at build). | CD M8 | Key on `VERCEL_ENV === 'production'` at request time. |
| R-M17 | Checkout key cannot be set from a Server Component render. | CD M11 | Create in `api/cart/route.ts`, store in cart cookie, rotate after checkout and on change. |
| R-M18 | Test gaps: e2e reads console log; no route-level security tests (session wallet, Origin, signatures, upload gating, env guard, secret-in-bundle); no Goal 9 test; contract runs pollute the org and send real email. | CD M12, IR N1–N2 | File-based dev email log; route tests and bundle grep; skip email for `+contract-`; cleanup. |
| R-M19 | "Every file is new" contradicts items 3–4; item 4 is this file. | ST 3, CD N1, IR N3 | Mark item 4 Modify; fix heading. |
| R-M20 | "Stays within governor limits" is untestable. | ST 4 | 200 records; assert `Limits.getQueries()` bounds. |
| R-M21 | "Three public pages" undefined for `lighthouserc.json`; PRD departure unacknowledged. | ST 5 | Name the routes; one clause on the PRD. |

## Nit (summary)

Paths in items 19–26 lack the `salesforce/force-app/main/default/` prefix;
`setup-agentforce.md` vs `agentforce-setup.md`; versions unpinned (API
version, Next.js 16 has no `next lint`, Tailwind v4 needs
`@tailwindcss/postcss`, `@lhci/cli` missing, `sf apex run test --wait`);
permission sets cannot list required, master-detail or Name fields; admin
read-only on the ledger is not enforceable for System Administrator;
referral code collisions and edge cases; cleanup uses CreatedDate; deletion
bypass undocumented; explore check is honour-level; cron expression missing;
mock-mode email and explore tracking undefined; session cookie names and JWT
claims; personal name used as a picklist value (`'Owner'`); tests without
expected outcomes; "current API version"; "unambiguous alphabet";
"full access" contradicts read-only ledger; vague labels; non-parallel Flow
descriptions; uneven field and signature detail; "CUJ" not expanded; tool
attribution line.
