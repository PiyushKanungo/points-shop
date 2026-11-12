# Stage 7: Critic Review

**Target:** `docs/designs/points_shop_v1.md` (FeatureRange, lines 1–645)
**Standards:** feature-spec-standard (design, structural); style persona only
**GoldfishContext:** `docs/prd.md`

## Reviewer Status

| Reviewer | Status | Result |
| --- | --- | --- |
| `egm-design` | completed | 1 Blocker, 11 Major, 10 Nit |
| `egm-structural` | completed | 3 Major, 6 Nit |
| `egm-style` | completed | 4 Major, 14 Nit |

## Blocker

| ID | Finding | Lines | Recommendation |
| --- | --- | --- | --- |
| D1 | Anyone can fill Salesforce storage and use up the email quota without signing in. `POST /auth/link` writes a wallet for any email and sends a Resend email; the only limit is per email. About 2,500 fake sign-ups fill 5 MB (every insert then fails); about 100 use up the daily Resend quota; the form can be used to send unwanted email to any address. Same issue as Stage 5 IC1. | 271, 355, 373–376, 501, 503, 603–607 | Stateless signed magic-link token; write the wallet only at verify. Per-IP and global rate limits and a bot challenge (Turnstile). Reserve part of the email quota for order emails. Add the case to CUJ 6. |

## Major

| ID | Lens | Finding | Lines | Recommendation |
| --- | --- | --- | --- | --- |
| D2 | design | Private sharing plus `with sharing` hides admin-loaded `Service__c` and `Earn_Task__c` from the integration user, and hides everything from the Agentforce agent user (which runs actions as itself). The ledger's sharing is set by its parent. Same as Stage 6 C5. | 282–290, 420–425 | Catalogue objects Public Read Only; state exact `Shop_Integration` access; define the agent user's permission set; choose the sharing keyword per class. |
| D3 | design | Checkout replay check runs before the wallet lock; nothing unique stops a second set of orders. Breaks Goal 2. Same as C7. | 321–331, 454–457 | Lock first, then check; or a unique key per order (`checkoutKey:slug`); concurrency test. |
| D4 | design | Deleting a wallet cascades to its ledger without firing child delete triggers, so "ledger entries cannot be deleted" (Goal 2) is false, and the manual privacy deletion does exactly this. | 83–84, 272, 503, 613–615 | Anonymise instead of delete, or block wallet delete when ledger entries exist; reword Goal 2. |
| D5 | design | Cal.com links are public: anyone with the URL can book a call without spending points. The webhook trusts any `orderId`; a booking can land on a cancelled order. | 270, 479–482 | Use private or single-use links, or cancel unmatched bookings through the Cal.com API; check the order's state, owner email and service type. |
| D6 | design | Self-referral by plus-addressing and Gmail dots is limited only by an unstated referral cap. | 196–203, 271, 308–310, 356 | State the cap; normalise emails for uniqueness and referral checks; optionally hold referral points until the friend does one real action. |
| D7 | design | Synchronous Agent API calls with a 10-second timeout will often time out; Vercel function duration limits apply. | 434–438, 483–486 | Measure in milestone 5; use streaming or a longer route timeout; separate "still thinking" state. |
| D8 | design | One visitor can use the shared 150 LLM requests per hour; one message likely costs several requests. | 108, 502, 434–438 | State requests per message; per-wallet hourly and daily message limits on the server. |
| D9 | design | `checkoutKey` for `ConciergeStartOrder` has no defined source (model-made keys break idempotency); the fallback silently drops Goal 6; "ask before ordering" is only a prompt instruction. Same as C6. | 95–98, 136–139, 424–433 | Server-made key (session ID + slug) or a second context variable; mark Goal 6 as conditional and state the reduced goal. |
| D10 | design | Email retries have no delay; in-memory dedupe barely works on serverless; no record of unsent emails; Automated Process user's access to the Named Credential not covered. Same as IC3. | 386–395, 404–412 | Delayed retries; Resend idempotency key (event ID) or a persistent store; status field; grant the Automated Process user the credential principal. |
| D11 | design | No automated warning as storage fills, no storage error handling, no backup if the org is terminated. | 64–67, 277–280, 503, 505, 620–625 | Scheduled storage alert; map `STORAGE_LIMIT_EXCEEDED`; archive plan; weekly Data Export or scheduled `sf data export`. |
| D12 | design | Custom magic-link sign-in, the most security-sensitive part, has no alternatives considered; no revocation story for the 30-day JWT. | 369–382, 507–586 | Add an alternative (Auth.js email provider, hosted auth, stateless token) with trade-offs; state revocation. |
| S1 | structural | No Risks & Mitigations section; risks are spread over three places and some lack mitigations (real usage, employment contract, dedupe, mock drift). | 53–70, 497–505, 590–615 | Add an H2 table: Risk, Category, Impact, Mitigation or "Accepted" plus reason. |
| S2 | structural | Rejection reasons credit people ("Rejected by author", "Decided by Claude") without links and, in Alternative C, without the trade-off. | 209–217, 518–586 | Lead each reason with the trade-off; link PRD sections where they are the source; replace the "Decided by" column with "Rationale". |
| S3 | structural | "Additional Resources" and "Future Improvements" are H3s under Non-Functional Requirements. | 627–643 | Promote to H2. |
| ST1 | style | "Mirrors SCAPI's basket-to-order flow" overstates the API (no basket resource). Same as C1. | 45–51 | Calibrate to "maps cart-to-order onto SCAPI concepts (see mapping)". |
| ST2 | style | "The proposed solution meets both" is contradicted by "real usage is not guaranteed". | 49–50, 61–63 | Say the design meets the architecture criterion and makes the first achievable. |
| ST3 | style | Goal 3 and Goal 7 headings claim more than their checks verify. | 85–87, 99–101 | Reword the headings to match the checks. |
| ST4 | style | "Service" means a shop offering, an external provider and an Apex class. | 14, 245, 289–321 | Keep "service" for offerings; say "service classes" and "third-party providers". |

## Nit

| ID | Lens | Finding | Recommendation |
| --- | --- | --- | --- |
| D13 | design | Explore cookie check proves nothing. | Sign the cookie or call it honour-system. |
| D14 | design | Browser-supplied `resumeUrl` is trusted. | Check host and issued path on the server; set content type and size in the upload token. |
| D15 | design | Refund amount comes from editable `Points_Spent__c`; admin can insert ledger rows directly. | Refund from the order's Redeem entry; trigger rejects inserts not from `LedgerService`. |
| D16 | design | Location of the 10-minute catalogue cache unstated. | Name the Next.js data cache / `revalidate`. |
| D17 | design | 5-per-day message counter has no storage. | Name it. |
| D18 | design | Checkout key reused after the cart changes returns old orders. | New key whenever cart contents change. |
| D19 | design | Token in the query string can leak through Referer or logs. | `Referrer-Policy: no-referrer` on `/auth/verify`, or use the URL fragment. |
| D20 | design | Cancelled booking orders leave the Cal.com booking in place. | Say whether Piyush cancels it in Cal.com by hand. |
| D21 | design | Lighthouse target has no CI to check it (PRD says CI per pull request). | Say how Goal 8's Lighthouse target is checked. |
| D22 | design | Unknown whether Agentforce session or transcript records count against 5 MB. | Confirm in milestone 5. |
| S4 | structural | "Decisions made while drafting" unnumbered among numbered H3s. | Number it or move it into the H2 lead. |
| S5 | structural | Section names differ from the standard's. | Rename to "Problem Statement", "Proposed Architecture". |
| S6 | structural | Unresolvable references (milestone 5, Detailed Implementation Plan, planned docs). | Anchor links; mark planned files "to be created in milestone N". |
| S7 | structural | Open Questions holds answered items (Connected App, launch set). | Move or reword. |
| S8 | structural | Formatting: line 411 unwrapped; stray space at 362; API table mixes path and body; uneven horizontal rules. | Fix each; split the API table into three columns. |
| S9 | structural | Data-model diagram omits lookups in the table. | Add them or caption the diagram. |
| ST5 | style | Hiring-market claim broader than the PRD's evidence. | Name the four employers from the November 2026 search. |
| ST6 | style | "Recruiters see many re-skinned templates" is unsupported. | Use the PRD's framing or drop. |
| ST7 | style | Vague words: "fail politely", "wrongly", "professional bar", "degrades politely", "small". | Replace with the measurable meaning. |
| ST8 | style | Goal 9 says "plain message"; copy is playful. | "Short explanatory message". |
| ST9 | style | "Hundreds of visits a day" vaguer than its own numbers (about 3,000 page views). | Calibrate; say whether Agent API calls share the limit. |
| ST10 | style | Email limits stated as emails and as recipients. | Use "recipients". |
| ST11 | style | "Very few community licences" unquantified. | Give the count or drop. |
| ST12 | style | "Random unguessable URLs"; "data is never deleted by a deployment". | "Random-path URLs"; "no destructive changes are deployed". |
| ST13 | style | "Rare duplicate" has no condition. | State when it happens. |
| ST14 | style | "The other two portfolio projects", "live", "Piyush's checklist" undefined; storage watching placed on the public page. | Name, quote, define; fix the page claim. |
| ST15 | style | Task checks "before step 1" placed after the list; "Checkout creates a key when the cart page loads". | Make them step 0; "The cart page creates…". |
| ST16 | style | "Claude, at the author's request:" repeated seven times. | Shorten. |
| ST17 | style | "No money changes hands" ignores the PRD's Buy Me a Coffee link. | Mention the link or say it is dropped. |
| ST18 | style | Line 411 too long. | Re-wrap. |

## Cross-stage agreement

*   Sign-in abuse: Stage 5 IC1, N1; Stage 7 D1 (Blocker).
*   Agent user and record access: Stage 6 C5; Stage 7 D2.
*   Concurrent double checkout: Stage 6 C7; Stage 7 D3.
*   Concierge checkout key and fallback: Stage 6 C6; Stage 7 D9.
*   Email retry and dedupe: Stage 5 IC3; Stage 7 D10.
*   SCAPI mapping claim and missing table: Stage 6 C1; Stage 7 ST1.
*   Explore cookie: Stage 5 N3; Stage 6 C10; Stage 7 D13.
