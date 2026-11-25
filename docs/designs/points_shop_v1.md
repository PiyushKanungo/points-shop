# Points Shop v1

*   **Author:** PiyushKanungo
*   **Status:** Approved for milestones 1–2 (revision 3, after the EGM re-audit)
*   **Date:** 2026-11-12
*   **Predecessor:** [PRD: Points Shop on Salesforce](../prd.md)

--------------------------------------------------------------------------------

## Overview

Points Shop is a personal web shop. Visitors earn points by doing small things
(signing up, giving feedback, referring a friend) and spend those points on
four real offerings that Piyush delivers by hand: an SFCC question answered by
email, a resume review, a 20-minute career chat, and a 45-minute mock
interview. No purchase uses money in v1; the only payment path is an optional
external Buy Me a Coffee link.

The shop has two parts:

*   **Back end on Salesforce.** A free Developer Edition org holds all data and
    rules: the catalogue, one wallet per email address, an append-only points
    ledger, earning rules, and orders. Apex classes enforce the rules, Apex
    REST endpoints expose them, Flows send the delivery emails, and an
    Agentforce agent answers visitor questions.
*   **Front end on Vercel.** A Next.js site shows the catalogue, the ways to
    earn, the visitor's balance, a cart, and order pages. Only the Next.js
    server talks to Salesforce. The browser never holds Salesforce credentials.

The project is a portfolio piece. Its job is to show recruiters for headless
SFCC roles a working headless commerce system that Piyush built and runs.

Terms used below: **offering** means one of the four things the shop sells
(stored in `Service__c`); **service class** means an Apex class such as
`LedgerService`; **provider** means a third-party service such as Resend.
**Milestones** are the PRD's six build steps, listed in
[Milestones](#milestones). A **CUJ** is a critical user journey, defined in
[Critical User Journeys](#critical-user-journeys-cujs).

## Problem Statement

Piyush's work history is SFRA (the older, server-rendered SFCC storefront).
Most SFCC roles in his November 2026 job search (VML, PVH, Arohana, ERPTREE)
asked for PWA Kit or Storefront Next, where a separate front end calls commerce
APIs. He has no public code that shows this, and an individual cannot get a
B2C Commerce sandbox to build one on SFCC itself.

A re-skinned template does not fix this: it looks like every other
candidate's project and proves only that the template runs. Two things make a
portfolio project credible:

1.  **It is real.** Real visitors use it and real orders get delivered.
2.  **The architecture matches the job.** A separate front end calls a
    commerce back end through an API, using the concepts SFCC uses:
    catalogue, price book, basket, order, order status, loyalty balance.

The design meets the second criterion directly: Next.js in front, Salesforce
behind it, and a REST API between them whose concepts map onto SCAPI (the
Salesforce Commerce API) as shown in [section 9](#9-sfcc-mapping). It makes the
first criterion achievable, because the offerings are real, but meeting it
depends on people using the shop (see [Risks](#risks--mitigations)).

The other two portfolio projects, the published SFCC Sandbox Switcher VS Code
extension and a Storefront Next template audit, cover SFCC itself.

## Goals

Each goal is met when its check passes.

1.  **A visitor can go from landing to a placed order without help.**
    Check: a new visitor signs in by magic link, gets 50 welcome points, earns
    50 more through the explore and LinkedIn tasks, and places an order for the
    100-point "Ask an SFCC developer" offering.
2.  **Points balances always equal the ledger, and the ledger cannot be
    altered entry by entry.**
    Check: Apex tests show that a balance never goes below zero; that the same
    checkout or task completion sent twice, including at the same moment,
    counts once; that each task's per-wallet limit holds; and that a ledger
    entry cannot be inserted outside `LedgerService`, updated or deleted. The
    one exception is the delete-wallet script, which removes a whole wallet
    and its history for a privacy request.
3.  **The browser never receives Salesforce credentials or the org URL.**
    Check: a test searches the built client bundles for the client secret, the
    access token pattern and the org domain, and finds none.
4.  **Piyush can fulfil every order from the Salesforce app.**
    Check: for each of the four offerings he can open the order, see the
    visitor's input (question text, resume link or booking time), and mark it
    Delivered. The visitor then gets an email.
5.  **The visitor gets an email at each step that matters.**
    Check: magic link, welcome, order confirmed (one per checkout), order
    delivered and order cancelled emails arrive. Next.js sends the first three;
    record-triggered Flows send the last two.
6.  **A signed-in visitor can ask the concierge about their balance, how to
    earn, and which offering fits, and can start an order from the chat.**
    Check: the Agentforce agent answers through Apex actions that read only the
    visitor's own wallet. This goal depends on the milestone 1 Agentforce test
    ([Open Questions](#open-questions)); if the test fails, the reduced goal is
    that the concierge answers how to earn and which offering fits, and links
    to the cart for ordering.
7.  **The "How it's built" page shows the architecture, the order lifecycle,
    the SFCC mapping and the GitHub link.**
    Check: the page renders all four without signing in.
8.  **The code meets stated quality thresholds.**
    Check: Apex coverage is 90% or more across the org's custom Apex and 85% or
    more per class; every trigger goes through `TriggerHandler`; a manual
    Lighthouse run on `/`, `/services/[slug]` and `/how-its-built` scores
    mobile Performance 90 or more and Accessibility 100. (The PRD's "Lighthouse
    CI on every pull request" waits for the CI item in its Later list.)
9.  **When Salesforce is unavailable, pages show a short explanation and the
    public pages still render.**
    Check: with Salesforce returning errors or timing out, the public pages
    serve their last good version and signed-in pages show "The shop's back
    office is taking a break. Try again in a few minutes."

## Non-Goals

*   **No payments.** Points are the only currency. Razorpay is later work in
    the PRD. The Buy Me a Coffee link is an external link, not a payment flow.
*   **No SFCC back end.** It needs an enterprise licence.
*   **No physical goods, shipping, inventory or tax.**
*   **No files in Salesforce.** Resumes go to Vercel Blob; only the link is
    saved.
*   **No LinkedIn verification.** LinkedIn tasks are honour-system link clicks,
    worth little and allowed once.
*   **No passwords or social sign-in.** Email magic link only.
*   **No visitor self-cancel.** Visitors reply to the confirmation email;
    Piyush cancels in Salesforce.
*   **No public reviews, promotions, admin dashboard or CI in v1.** Reviews are
    collected on delivered orders but not shown publicly.
*   **No uptime promise.** The site is labelled a personal portfolio project.
*   **English only.**

## Open Questions

*   **Agent API with client credentials** (the rest was answered by the milestone 1
    Agentforce test on 2026-11-16, see [docs/spike-agentforce.md](../spike-agentforce.md)):
    wallet binding through an Agent Script state variable works and the model
    cannot override it; replies take about 10–11 s; sessions use no data storage.
    Still open: calling the published agent through the Agent API with the
    storefront's client credentials (first step of milestone 5).
*   **Employment contract:** does the Capgemini contract allow free SFCC help on
    the side? Blocks launch, not the build.
*   **Final point values** for offerings and tasks. The seed tables use the
    PRD's numbers.
*   **Name and domain** for the shop.

## Critical User Journeys (CUJs)

### CUJ 1: Visitor earns points and redeems an offering

*   **Given**: A visitor with no wallet opens the shop.
*   **When**: They pass the bot check, enter their email, open the magic link,
    press "Sign in", complete tasks until their balance covers an offering,
    add it to the cart, and check out.
*   **Then**: A wallet exists for their email with a 50-point Earn entry; each
    completed task adds one Earn entry; checkout adds one Redeem entry and one
    order per offering; the shown balance equals the ledger sum; one
    confirmation email arrives listing every order and what to do next.

### CUJ 2: Visitor gives fulfilment details and receives the offering

*   **Given**: A visitor has an order in Awaiting Details.
*   **When**: They type the question, upload a resume PDF, or book a slot, and
    Piyush later marks the order Delivered.
*   **Then**: The order moves to In Progress and shows the input; on delivery
    the visitor gets an email and is invited to review; the first review adds
    75 points and a repeated review request returns the same result.

### CUJ 3: Recruiter takes a two-minute look

*   **Given**: A recruiter opens the shop link from the resume.
*   **When**: They browse the catalogue and open "How it's built".
*   **Then**: They see the catalogue, the architecture, the order lifecycle,
    the SFCC mapping and the GitHub link without signing in, even if
    Salesforce is briefly unavailable.

### CUJ 4: Piyush fulfils or cancels an order

*   **Given**: A visitor placed an order.
*   **When**: Piyush gets the new-order email, opens the Open Orders list in the
    Salesforce app, delivers and sets the status to Delivered, or sets it to
    Cancelled.
*   **Then**: Delivered: `Delivered_At__c` is set and the delivered email goes
    out. Cancelled: the points spent come back once as a Refund entry and the
    cancelled email goes out.

### CUJ 5: Visitor asks the concierge

*   **Given**: A signed-in visitor opens the chat panel.
*   **When**: They ask about their balance, how to earn more, which offering
    fits, or ask it to order one.
*   **Then**: Answers use their own wallet and the live catalogue; an order
    started from chat follows the same checkout rules and is placed once even
    if the request repeats; when the Agentforce limit is reached, the chat says
    it is busy.

### CUJ 6: Abuse attempts fail

*   **Given**: Someone tries to gain points or break the shop.
*   **When**: They submit thousands of sign-in requests with random emails;
    replay a task completion; double-submit checkout from two tabs at once;
    claim a once-only task twice; call the task endpoint for `signup`,
    `referral` or `review`; or call a Next.js route for another wallet.
*   **Then**: Sign-in requests write nothing to Salesforce until a link is
    opened, and the bot check stops scripted requests; replays and double
    submits count once; limits hold; system-only tasks are rejected; routes act
    only on the session's wallet. Self-referral with a second real email
    address cannot be prevented; it is capped at 5 referrals (500 points).

## Proposed Architecture

### 1. Decision record

| Decision | Choice | Rationale |
| --- | --- | --- |
| Front end | Headless Next.js on Vercel | The Problem Statement requires a separate front end calling an API. |
| Email | Next.js sends magic link, welcome, order confirmed and owner alerts through Resend; record-triggered Flows send Delivered and Cancelled with Send Email actions | Developer Edition allows 15 Flow email recipients a day; Delivered and Cancelled happen about once a day at most. One signed webhook pipeline for 1–2 emails a day is not worth its ten files. Revisit if Flow emails exceed 10 a day. |
| Sign-in | Stateless signed magic-link token; wallet created only on verify | Nothing is written to Salesforce for unverified emails, so random sign-ups cannot fill storage. |
| Agentforce access | Agent API from the Next.js server with server-set context variables | Keeps the wallet binding out of the browser and keeps the shop's own UI. Confirmed or replaced by the milestone 1 test. |
| Fulfilment input timing | After the order is placed, on the order page | Checkout stays one step for all four offerings; a booking needs an order first. |
| Cancellation | Piyush only; refund once from the order's Redeem entry | Points spent on an order Piyush cannot deliver come back. |
| Balance | Roll-up summary of ledger entries on the wallet plus a validation rule rejecting a negative balance | The database enforces "never negative", not only Apex. |
| Storefront without an org | A fixture stub with canned data and canned errors, no rules | The rules exist once, in Apex. |
| Build order | Milestones 1–2 (Salesforce foundation, earn and checkout, REST API) first, each deployed and tested in the org | Matches the PRD's "each milestone ends deployed". |

### 2. System overview and data model

```text
                       Browser
                          │  HTTPS (pages, JSON to /api/*)
                          ▼
        ┌──────────────────────────────────────────┐
        │ Next.js on Vercel  (storefront/)         │
        │  pages, /api/* routes (session check),   │
        │  Resend sender, Turnstile check          │
        └───┬──────────────┬──────────────┬────────┘
            │ OAuth client │ Agent API    │ webhooks in (Cal.com),
            │ credentials  │              │ Blob upload callback
            │ + Apex REST  │              │
            ▼              ▼              │
        ┌──────────────────────────────┐  │
        │ Salesforce Developer Edition │◄─┘ (via Apex REST)
        │  objects + validation rules  │
        │  Apex service classes + REST │
        │  Flows (Delivered, Cancelled)│──► email (Salesforce)
        │  Agentforce concierge        │
        └──────────────────────────────┘
   Providers: Resend (email), Vercel Blob (resumes), Cal.com (booking),
   Cloudflare Turnstile (bot check)
```

Rules that hold across the system:

*   The browser only talks to Next.js. All secrets are Vercel server
    environment variables.
*   Next.js takes the wallet ID from its session cookie. No browser-facing
    route accepts a wallet ID. The Cal.com webhook is the one server-to-server
    exception; it reads the wallet and order IDs from booking metadata that
    Next.js wrote, and Apex re-checks that the order belongs to that wallet.
*   Every points change goes through `LedgerService`.

```text
Service__c ──< Shop_Order__c >── Wallet__c ──< Points_Ledger__c (master-detail)
                                   │  ▲            │      │
Earn_Task__c ──< Task_Completion__c┘  │            │      └─> Shop_Order__c (lookup)
                       ▲              └ Referred_By__c      └─> Task_Completion__c (lookup)
                       └──────────────────────────────────────┘
```

| Object | Purpose | Org-wide sharing |
| --- | --- | --- |
| `Service__c` | The catalogue and its price book (one row per offering) | Public Read Only |
| `Earn_Task__c` | Earning rules | Public Read Only |
| `Wallet__c` | One per email; balance is a roll-up of the ledger | Private |
| `Points_Ledger__c` | Append-only signed entries | Controlled by Parent |
| `Task_Completion__c` | One row per counted task completion | Private |
| `Shop_Order__c` | One order per offering bought | Private |

Field lists with types are in the [Detailed Implementation
Plan](#detailed-implementation-plan). The integration user creates and so owns
every wallet, completion and order; Piyush's System Administrator profile sees
everything.

**Seed data: offerings** (placeholder points from the PRD)

| Slug | Name | Fulfilment type | Points | Delivery promise |
| --- | --- | --- | --- | --- |
| `ask-sfcc-question` | Ask an SFCC developer | Question | 100 | Reply by email within 48 hours |
| `resume-review` | Resume review for Salesforce / SFCC developers | Resume | 250 | Annotated review within 3 days |
| `career-chat` | 20-minute career chat | Booking | 300 | Video link sent when you book |
| `mock-interview` | Mock SFCC interview (45 min) | Booking | 500 | Call plus written feedback |

**Seed data: tasks**

| Key | Name | Verification | Points | Max per wallet |
| --- | --- | --- | --- | --- |
| `signup` | Sign up with email | System | 50 | 1 |
| `explore` | Explore the site (3 pages including How it's built) | Honour | 30 | 1 |
| `feedback` | Give feedback on the site | Form | 50 | 1 |
| `email-piyush` | Send Piyush an email | Form | 40 | 1 |
| `linkedin-post` | Read and react to a LinkedIn post | Honour | 20 | 1 |
| `linkedin-hi` | Say hi on LinkedIn | Honour | 20 | 1 |
| `referral` | Refer a friend who signs up | Referral | 100 | 5 |
| `review` | Review a delivered order | Review | 75 | 10 |

Verification values: **System** (awarded by the sign-in flow), **Form**
(awarded when the site's form is submitted; the text is kept as evidence),
**Honour** (awarded on a click or page visit the visitor reports),
**Referral** (awarded to the referrer when a new wallet is created with their
code), **Review** (awarded when a review is saved on a delivered order). Only
Form and Honour tasks can be completed through the task endpoint.

Storage: a wallet with 10 ledger entries, 5 completions and 2 orders is about
18 records × 2 KB = 36 KB. 50 sign-ups use about 1.8 MB of the 5 MB limit.

### 3. Points rules (Apex service classes)

**Sharing.** `ShopApi` is `with sharing`. `LedgerService`, `EarnService`,
`CheckoutService`, `WalletService`, `OrderService` and `CatalogService` are
`inherited sharing`, so they run with the caller's record access (the
integration user, who owns the records). All service classes use system-mode
SOQL and DML: permission sets decide which objects a user can open in the app
or reach through the API, not what the service classes can read or write.

**Transactions.** `ShopApi` returns errors as normal responses, and Apex
commits any DML done before a caught exception. So every state-changing
service method (`checkout`, `completeTask`, `verifySignIn`, `saveDetails`,
`saveBooking`, `submitReview`) takes `Database.setSavepoint()` on entry and,
on any exception, calls `Database.rollback(sp)` and rethrows. A failed request
leaves no partial records. The concierge action classes are
`without sharing` and always filter by the wallet ID bound by the server
([section 7](#7-agentforce-concierge)).

**`LedgerService`** is the only writer of `Points_Ledger__c`.

*   `postAll(List<Posting>)` locks each affected wallet
    (`SELECT ... FOR UPDATE`), skips postings whose idempotency key already
    exists (returning the existing entries), and inserts the rest. A concurrent
    insert of the same key fails on the unique index; the service catches
    `DUPLICATE_VALUE` and returns the existing entry.
*   If an insert would take a balance below zero, the wallet validation rule
    `Balance_Not_Negative` fails; the service recognises its message prefix
    `INSUFFICIENT_POINTS:` and throws `new ShopException('INSUFFICIENT_POINTS',
'Not enough points.')`. Every `ShopException` is built with a code and a
message.
*   A static flag set only inside `postAll` is checked by the ledger trigger,
    which rejects any other insert.

**`EarnService`**

*   `completeTask(walletId, taskKey, evidence)` — called by the task endpoint.
    Rejects tasks whose verification is not Form or Honour. Locks the wallet;
    if a completion with key `walletId:taskKey` exists, returns it as a replay;
    if the wallet has reached `Max_Per_Wallet__c`, throws
    `TASK_LIMIT_REACHED`; otherwise inserts the completion and posts the
    points with idempotency key `earn:<Completion_Key__c>` and the completion's
    ID on the entry.
*   `awardSystemTask(walletId, taskKey, ref)` — internal, used by sign-in
    (`signup`, no ref), referral (`referral`, ref = new wallet ID) and review
    (`review`, ref = order ID). Completion key `walletId:taskKey` without a
    ref, `walletId:taskKey:ref` with one. Same replay and limit rules; the
    ledger key is `earn:<Completion_Key__c>` here too, so each review and each
    referral gets its own entry.

**`CheckoutService.checkout(walletId, checkoutKey, slugs)`**

1.  Validate: 1–4 distinct slugs, `checkoutKey` matches
    `^[A-Za-z0-9:_-]{8,80}$`.
2.  Lock the wallet.
3.  If orders with this wallet and `Checkout_Key__c` exist, return them as a
    replay.
4.  Load the offerings; reject unknown or inactive slugs.
5.  If the balance is below the total, throw `INSUFFICIENT_POINTS`.
6.  Insert one order per offering with `Order_Key__c =
    walletId:checkoutKey:slug` (unique), `Points_Spent__c` equal to the
    offering's price, and status Awaiting Details.
7.  Post one Redeem entry per order with idempotency key
    `redeem:<Order_Key__c>` and `shopOrderId` set to the order.
8.  Any failure rolls back the whole transaction.

Two identical requests at the same moment serialise on the wallet lock; the
second finds the first's orders in step 3. The unique `Order_Key__c` is a
second guard if the lock is ever bypassed.

**`OrderService`**

*   `saveDetails(walletId, orderId, question | resumeUrl)` — the order must
    belong to the wallet, be Awaiting Details, and match its offering's
    fulfilment type. Moves the order to In Progress.
*   `saveBooking(walletId, orderId, bookingUid, bookingStart)` — same checks for
    a Booking offering; used only by the Cal.com webhook route.
*   `submitReview(walletId, orderId, rating, text)` — in one transaction: lock
    the wallet; load the order (must belong to the wallet); if the review
    completion for this order exists, return a replay; require status
    Delivered and no saved review; save rating (1–5) and text; award the
    `review` task. If the award fails (for example the eleventh review hits
    `TASK_LIMIT_REACHED`), the savepoint rollback also discards the saved
    review, and the caller gets the error.
*   Cancellation by Piyush: setting status Cancelled makes the order trigger
    post a Refund entry equal to the order's Redeem amount, with idempotency
    key `refund:<orderId>`.

**`WalletService.verifySignIn(email, issuedAt, referralCode)`** — see
[section 5](#5-sign-in-magic-link-run-by-nextjs).

**Triggers.** One trigger per object (`Wallet__c`, `Points_Ledger__c`,
`Shop_Order__c`, `Task_Completion__c`) calls a handler that extends an in-repo
`TriggerHandler` base class. The base class is written in the repo rather than
taken from a library so it can be explained in an interview. Handlers are
bulk-safe: a fixed number of queries and DML statements per batch.

### 4. API contract (Apex REST, `/services/apexrest/shop/v1`)

Called only by the Next.js server as the integration user. Bodies are JSON.
Dates are ISO 8601 UTC strings. IDs are Salesforce record IDs (18 characters).

**Shared types**

```text
Offering    { slug, name, description, pointsPrice: int, fulfilmentType: "Question"|"Resume"|"Booking",
              deliveryPromise, bookingUrl: string|null }
Task        { key, name, description, points: int, verification: "System"|"Form"|"Honour"|"Referral"|"Review",
              maxPerWallet: int, linkUrl: string|null }
LedgerEntry { id, amount: int, entryType: "Earn"|"Redeem"|"Refund"|"Adjustment", reason, createdAt }
Wallet      { id, email, balance: int, referralCode, recentEntries: LedgerEntry[] (newest 20),
              taskCounts: { [taskKey]: int } }
Order       { id, orderNumber, offering: { slug, name, fulfilmentType }, status: "Awaiting Details"|"In Progress"|"Delivered"|"Cancelled",
              pointsSpent: int, question: string|null, resumeUrl: string|null, bookingStart: string|null,
              createdAt, deliveredAt: string|null, cancelledAt: string|null,
              review: { rating: int, text: string } | null }
Error       { error: { code, message } }
```

**Endpoints**

| Method and path | Request body | Response (200) |
| --- | --- | --- |
| `GET /catalog` | — | `{ offerings: Offering[], tasks: Task[] }` (active only, sorted) |
| `POST /auth/verify` | `{ email, issuedAt: int (epoch ms), referralCode?: string }` | `{ wallet: Wallet, isNew: boolean }` |
| `GET /wallets/{walletId}` | — | `{ wallet: Wallet }` |
| `POST /wallets/{walletId}/tasks/{taskKey}` | `{ evidence?: string (≤2,000) }` | `{ pointsAwarded: int, replay: boolean, balance: int }` |
| `POST /wallets/{walletId}/checkout` | `{ checkoutKey, offerings: string[] }` | `{ orders: Order[], replay: boolean, balance: int }` |
| `GET /wallets/{walletId}/orders` | — | `{ orders: Order[] }` (newest first) |
| `GET /wallets/{walletId}/orders/{orderId}` | — | `{ order: Order }` |
| `POST /wallets/{walletId}/orders/{orderId}/details` | `{ question?: string (20–2,000) , resumeUrl?: string }` (exactly one) | `{ order: Order }` |
| `POST /wallets/{walletId}/orders/{orderId}/booking` | `{ bookingUid, bookingStart }` | `{ order: Order }` |
| `POST /wallets/{walletId}/orders/{orderId}/review` | `{ rating: int 1–5, text: string (≤1,000) }` | `{ order: Order, pointsAwarded: int, replay: boolean, balance: int }` |

**Error codes**

| Code | HTTP | When |
| --- | --- | --- |
| `VALIDATION` | 400 | Bad body, bad path, task not completable through the endpoint |
| `UNAUTHORIZED` | 401 | Sign-in token already used |
| `NOT_FOUND` | 404 | Unknown route, wallet, order, offering or task; order of another wallet |
| `INSUFFICIENT_POINTS` | 409 | Balance too low |
| `TASK_LIMIT_REACHED` | 409 | Per-wallet task limit reached |
| `INVALID_STATE` | 409 | Order not in the status the action needs; review already saved |
| `INTERNAL` | 500 | Unexpected error (message hidden) |

The storefront adds `UNAVAILABLE` for timeouts, 5xx, `REQUEST_LIMIT_EXCEEDED`
and `STORAGE_LIMIT_EXCEEDED`.

### 5. Sign-in (magic link, run by Next.js)

1.  The visitor passes the Turnstile check and submits an email (and a
    referral code if they arrived by a referral link). Next.js verifies the
    Turnstile token with Cloudflare.
2.  Next.js builds a token: `base64url(JSON{ email, iat, exp, ref })` plus
    `.` plus `base64url(HMAC-SHA256(MAGIC_LINK_SECRET, payload))`, with
    `exp = iat + 15 minutes`. It emails the link `/auth/verify#token=…`
    through Resend. Salesforce is not called.
3.  The verify page reads the token from the URL fragment (never sent to
    servers or in Referer headers) and shows a "Sign in" button, because email
    scanners open links automatically. The button posts the token to
    `/api/auth/verify`.
4.  Next.js checks the signature and expiry, then calls
    `POST /auth/verify { email, issuedAt: iat, referralCode: ref }`.
5.  `WalletService.verifySignIn` lower-cases the email, then locks the wallet
    if it exists or inserts it if not. If the insert fails with
    `DUPLICATE_VALUE` on `Email__c` (two first sign-ins at once), it re-queries
    the wallet `FOR UPDATE` and continues as for an existing wallet. If `Last_Token_Issued_At__c >= issuedAt`, it throws
    `UNAUTHORIZED` (token already used, or an older token). Otherwise it sets
    `Last_Token_Issued_At__c = issuedAt`. For a new wallet it sets
    `First_Sign_In_At__c`, awards `signup`,
    and if `referralCode` matches another wallet it sets `Referred_By__c` and
    awards that wallet's `referral` task (unknown codes are ignored; codes on
    an existing wallet are ignored).
6.  Next.js sets an `httpOnly`, `Secure`, `SameSite=Lax` cookie `ps_session`:
    a JWT (HS256, `SESSION_SECRET`, 30 days) with `sub = walletId` and
    `email`. For a new wallet it sends the welcome email.

Revocation: rotating `SESSION_SECRET` signs every visitor out; rotating
`MAGIC_LINK_SECRET` invalidates links already sent. Sign-out deletes the
cookie.

### 6. Email

| Email | Sent by | When |
| --- | --- | --- |
| Magic link | Next.js (Resend) | Sign-in form submitted |
| Welcome | Next.js (Resend) | `/auth/verify` returns `isNew: true` |
| Order confirmed (one per checkout, listing each order and its next step) | Next.js (Resend) | Checkout returns `replay: false` |
| New-order alert to Piyush | Next.js (Resend) | Same as above |
| Feedback and "email Piyush" messages | Next.js (Resend) | Form submitted |
| Order delivered | Flow `Order_Delivered` (Send Email action) | `Status__c` changes to Delivered |
| Order cancelled | Flow `Order_Cancelled` (Send Email action) | `Status__c` changes to Cancelled |

The two Flows are record-triggered after save, built in Flow Builder and
written as Flow metadata in milestone 4 and deployed active. Each has a fault path
that creates a high-priority Task for the user who changed the status, so the
status change and any refund still save when the email fails. Resend sends are best-effort: a failure is logged and the
visitor still sees the order page, which shows the same next steps.

### 7. Agentforce concierge

Built in milestone 5, after the milestone 1 test answers the open questions.

*   **Agent:** one Agentforce Service Agent, "Shop Concierge", with one topic.
    Instructions keep it on shop questions, forbid promising delivery beyond
    each offering's delivery promise, and tell it to confirm before ordering.
*   **Context variables** set by Next.js when it starts an Agent API session:
    `WalletId` and `SessionKey` (a random UUID per chat session). Both are
    mapped to action inputs in Agent Builder so the model cannot set them.

| Action (Apex invocable) | Inputs | Outputs |
| --- | --- | --- |
| `ConciergeGetBalance` | `walletId` (context) | `balance`, `recentEntries` (5) |
| `ConciergeGetCatalog` | `walletId` (context, optional) | offerings with name, description, points; tasks the wallet can still complete; `balance` if a wallet is given |
| `ConciergeStartOrder` | `walletId`, `sessionKey` (context), `offeringSlug` (model) | `orderNumber`, `balance`, or an error message |

`ConciergeStartOrder` builds the checkout key in Apex as
`agent:<sessionKey>:<slug>`, so a repeated request in the same chat places one
order. The model recommends offerings from the catalogue output; there is no
separate matching algorithm.

*   **Running user and access:** the agent's actions run as its agent user. A
    `Shop_Agent` permission set grants class access to the three actions and
    read access to the objects; the action classes are `without sharing` and
    filter every query by the bound wallet.
*   **Fallback** if context variables cannot be mapped: ship only
    `ConciergeGetCatalog` without a wallet; Goal 6 reduces as stated there.
*   **Chat route:** `POST /api/concierge` (signed-in visitors only) starts or
    reuses a session (ID in an `httpOnly` cookie), sends the message, and has
    `maxDuration` set to the latency measured in the test. A limit error shows
    "The concierge is busy right now. Try again in a few minutes."

### 8. Storefront (milestones 3, 4 and 6)

These choices are fixed now; each milestone gets its own implementation plan.

*   **Stack:** Next.js (App Router), TypeScript, Tailwind CSS v4, `jose`,
    `zod`, Resend SDK, `@vercel/blob`.
*   **Pages:** `/`, `/services/[slug]`, `/cart`, `/orders`, `/orders/[id]`,
    `/signin`, `/auth/verify`, `/how-its-built`, `/feedback`, `/contact`.
*   **Public pages** (`/`, `/services/[slug]`, `/how-its-built`) use ISR with
    `revalidate = 600`. If revalidation fails, Next.js keeps serving the last
    good page; the failure is logged.
*   **Balance:** shown in the header from the server on each page load and
    refreshed after each action that changes it. There is no push channel; the
    PRD's "live balance" means updated after the visitor's own actions.
*   **Cart:** cookie `ps_cart` holds `{ slugs: string[], checkoutKey }`.
    `POST /api/cart` creates or replaces the `checkoutKey` (a UUID) whenever
    the contents change, and `/api/checkout` clears the cookie after success.
*   **Backend adapter:** a `ShopBackend` interface transcribing section 4.
    `SalesforceBackend` uses a cached client-credentials token (refreshed on
    401) and a 10-second timeout. `StubBackend` returns fixture JSON and
    canned errors chosen by fixture flags; it enforces no rules. The adapter is
    chosen by `SHOP_BACKEND`; `env.ts` refuses `stub` when
    `VERCEL_ENV === 'production'`, checked at request time (not at build).
*   **Explore task:** honour-system. The client records visited paths in
    session storage and calls the task endpoint on reaching `/how-its-built`
    after three distinct paths.
*   **Resume upload:** `/api/resume-upload` uses `handleUpload` from
    `@vercel/blob/client` with `clientPayload = { orderId }`; before issuing a
    token it checks the session's wallet owns the order and the order is
    Awaiting Details with a Resume offering; token options
    `allowedContentTypes: ['application/pdf']`, `maximumSizeInBytes: 5 MB`,
    `addRandomSuffix: true`, pathname prefix `resumes/<orderId>/`. After the
    upload the browser calls `/api/orders/[id]/details` with the URL; the route
    accepts it only if its host is the project's Blob host and its path starts
    with that prefix.
*   **Cal.com:** booking event types are hidden from the Cal.com profile. The
    order page builds the booking link with `metadata[walletId]` and
    `metadata[orderId]`. `/api/webhooks/calcom` verifies `X-Cal-Signature-256`
    (HMAC-SHA256 of the raw body with `CALCOM_WEBHOOK_SECRET`), and on
    `BOOKING_CREATED` calls the booking endpoint; Apex rejects a mismatched
    wallet and order. Bookings without a valid order are ignored and Piyush
    cancels them in Cal.com by hand, as he does for cancelled orders.
*   **Origin check:** every state-changing `/api/*` route rejects a request
    whose `Origin` is not `SITE_URL`, except `/api/webhooks/*` (signature
    checked) and the Blob upload-completed callback (Blob token checked).
*   **Failure display:** `UNAVAILABLE` shows the Goal 9 message on the
    affected component.
*   **Tests (milestone 3):** unit tests for the token, session, cart and
    signature code; route tests that a wallet ID in a request body is ignored,
    that the Origin check and signature checks reject bad requests, and that
    the upload token is refused for another wallet's order; a bundle search for
    secrets (Goal 3); a Goal 9 test with the backend returning errors; a
    Playwright happy path on the stub, reading the magic link from a dev-only
    JSON email log (`storefront/.local-email/`); a smoke test of the REST
    shapes against the real org that uses `+smoke-` addresses and skips email.

### 9. SFCC mapping

| This shop | SFCC / SCAPI equivalent | Difference |
| --- | --- | --- |
| `Service__c` with `Points_Price__c` | Catalog products plus a price book | Points act as the only currency |
| `Wallet__c` + `Points_Ledger__c` | Loyalty balance, or a gift certificate's transaction history | Balance is a database roll-up of the ledger |
| `Earn_Task__c` rules with per-wallet limits | Promotions with customer group and usage limits | Rules award points instead of discounts |
| Cart cookie → `POST /checkout` → `Shop_Order__c` | SCAPI Shopper Baskets (server-side basket) → Shopper Orders (create order from basket) | The basket lives only in the storefront cookie; checkout sends the whole basket in one call |
| Order statuses Awaiting Details → In Progress → Delivered / Cancelled | Order status lifecycle (created, new, completed, cancelled) | Fulfilment is a person, not a warehouse |
| Flows and the Open Orders list view | Order notification emails and Business Manager order management | Built on Salesforce Platform, not Business Manager |
| Apex REST consumed by a Next.js server | SCAPI consumed by PWA Kit or Storefront Next | Same headless pattern; a different API |

### 10. Platform limits

| Limit (Developer Edition) | Design response |
| --- | --- |
| 50 email recipients a day, 15 from Flows | Salesforce sends only Delivered and Cancelled emails (about 1 a day). |
| 150 Agentforce LLM requests an hour | Chat for signed-in visitors only; "busy" message on limit; requests per message measured in milestone 1. |
| About 5 MB data storage | No records for unverified emails; resumes in Vercel Blob; about 1.8 MB at 50 sign-ups; `STORAGE_LIMIT_EXCEEDED` shows the unavailable message. |
| 15,000 API calls per 24 hours | Public pages are ISR and call Salesforce once per 10 minutes; a signed-in page view makes about 3 calls, so about 5,000 signed-in page views a day. Whether Agent API calls count is checked in milestone 1. |
| Org terminated after 45 days without login | Piyush logs in to fulfil orders; a monthly reminder also runs the data export. |

### Milestones

| Milestone | Delivers | Exit check |
| --- | --- | --- |
| 1 Salesforce foundation | Org, CLI, objects, permission sets, `LedgerService`, triggers, seed data, Agentforce test | Deploy succeeds; ledger tests pass; seed imported; test results recorded |
| 2 Earn and checkout | Earn, checkout, wallet, order and catalogue service classes; Apex REST; integration user and External Client App | All Apex tests pass at the coverage in Goal 8; `GET /catalog` works with client credentials |
| 3 Storefront | Next.js app against the REST API | Storefront tests pass; CUJ 1 works on a Vercel preview |
| 4 Fulfilment | Order details, resume upload, Cal.com, the two Flows | CUJ 2 and CUJ 4 work end to end |
| 5 Concierge | Agent, actions, chat panel | CUJ 5 works |
| 6 Launch | "How it's built", Lighthouse, domain, launch post | Goal 7 and Goal 8 checks pass |

## Alternatives Considered

### Alternative A: Lightning Web Components on an Experience Cloud site

*   **Pros**: One platform; built-in passwordless login for external users.
*   **Cons**: Not headless, so it does not close the gap the project exists for.
    Each visitor becomes an Experience Cloud user, and Developer Edition
    includes only a handful of those licences.
*   **Reason for Rejection**: Fails the architecture criterion in the Problem
    Statement.

### Alternative B: Salesforce sends every email

*   **Pros**: No email provider.
*   **Cons**: Developer Edition allows 15 Flow and 50 total email recipients a
    day; magic links would stop after about 40 sign-ins in a day.
*   **Reason for Rejection**: Sign-in must not depend on that cap.

### Alternative C: Flows decide every email and call Next.js through a signed webhook

*   **Pros**: All email timing lives in Salesforce; no Salesforce email limit.
*   **Cons**: About ten extra files (invocable class, Queueable, Named
    Credential, shared secret, signature code, webhook route, dedupe, retries)
    for about one email a day, plus duplicate and lost-email cases on
    serverless.
*   **Reason for Rejection**: Cost out of proportion to the volume. This was
    the first draft's choice and was reversed after review.

### Alternative D: Salesforce embedded messaging widget for the concierge

*   **Pros**: Salesforce hosts the chat UI.
*   **Cons**: Runs in the browser, so tying the chat to a wallet needs user
    verification with a signed JWT; unclear availability on Developer Edition;
    its look does not match the shop.
*   **Reason for Rejection**: The server-side Agent API keeps the wallet
    binding out of the browser.

### Alternative E: Balance as a number field updated by Apex

*   **Pros**: No master-detail relationship.
*   **Cons**: Balance and ledger can drift; "never negative" enforced only by
    Apex.
*   **Reason for Rejection**: The roll-up always equals the ledger sum and the
    validation rule holds even if Apex has a bug.

### Alternative F: The browser calls Salesforce directly

*   **Pros**: No server layer.
*   **Cons**: Needs a Salesforce identity for every visitor and exposes the API.
*   **Reason for Rejection**: The [PRD's technical
    approach](../prd.md#technical-approach) requires server-only calls.

### Alternative G: Collect fulfilment input at checkout

*   **Pros**: One step; no Awaiting Details state.
*   **Cons**: A different form per offering inside checkout; a booking cannot
    exist before the order.
*   **Reason for Rejection**: Keeps checkout identical for all offerings.

### Alternative H: An in-memory mock backend with the same rules

*   **Pros**: Abuse cases can be run without an org.
*   **Cons**: Every points rule exists twice and needs a parity test suite;
    tests on the mock test the copy, not Apex.
*   **Reason for Rejection**: The rules belong in Apex alone; the storefront
    uses a fixture stub.

### Alternative I: Ready-made sign-in (Auth.js email provider or a hosted auth service)

*   **Pros**: Less security code to write; maintained by others.
*   **Cons**: Auth.js's email provider needs a database adapter to store
    verification tokens, which means another database or Salesforce writes for
    unverified emails (the storage attack). Hosted services add an account and
    their own user store, separate from the wallet.
*   **Reason for Rejection**: A stateless signed token is about 40 lines,
    writes nothing until verify, and is interview material in its own right.

## Risks & Mitigations

| Risk | Category | Impact | Mitigation or acceptance |
| --- | --- | --- | --- |
| Nobody places orders | Launch | "It is real" claim fails | Piyush promotes the shop (LinkedIn post at launch); success targets are reviewed after 3 months. |
| Employment contract forbids free side help | Launch | Shop cannot launch as designed | Check the clause before launch; fallback is launching with the Ask an SFCC developer offering only, or as a demo with Piyush as the only customer. |
| Agent API or context-variable mapping unavailable on Developer Edition | Failure mode | Goal 6 reduced | Milestone 1 test; fallback in section 7. |
| One visitor uses the hourly Agentforce limit | Scalability | Chat busy for everyone | Accepted; revisit if the test shows a message uses many requests. |
| Agent replies slower than the route timeout | Failure mode | Chat errors | `maxDuration` set from the measured latency. |
| Org terminated or Developer Edition terms change | Failure mode | All data lost | Monthly `sf data export` (or Setup's Data Export schedule) with the login reminder; site labelled a portfolio project. |
| Storage fills | Scalability | Inserts fail | About 1.8 MB at the 50 sign-up target; storage error shows the unavailable message; Piyush checks Storage Usage monthly. |
| Self-referral with a second email | Abuse | Free points | Capped at 5 referrals per wallet. |
| Someone books a Cal.com slot without an order | Abuse | Piyush's time | Hidden event types; webhook ignores unmatched bookings; Piyush cancels by hand. |
| Resend send fails | Failure mode | Visitor misses an email | Order page shows the same next steps; failure logged. Magic-link failure shows an error and the visitor retries. |
| Scripted sign-up requests | Abuse | Email quota used | Turnstile on the sign-in form; nothing written to Salesforce before verify. |

## Non-Functional Requirements

*   **Security**
    *   Secrets (`SF_CLIENT_SECRET`, `SESSION_SECRET`, `MAGIC_LINK_SECRET`,
        `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CALCOM_WEBHOOK_SECRET`,
        `BLOB_READ_WRITE_TOKEN`) live only in Vercel environment variables and
        git-ignored `.env.local`. The Agent API uses the same client
        credentials, scoped by the Connected App.
    *   Magic-link tokens: HMAC-signed, 15-minute expiry, single use through
        `Last_Token_Issued_At__c`, carried in the URL fragment.
    *   Form endpoints (sign-in, feedback, contact) require a Turnstile token
        and cap text at 2,000 characters.
*   **Privacy**
    *   Personal data held: email addresses, question text, feedback, resume
        PDFs (random-path Blob URLs), booking times.
    *   The footer says what is stored and that a visitor can email Piyush to
        have it deleted. Piyush runs `scripts/apex/delete-wallet.apex`, which
        removes the wallet's completions, orders, ledger and wallet, and
        deletes the Blob files by hand.
*   **Performance**
    *   Public pages are ISR; target mobile Lighthouse Performance 90 or more
        and Accessibility 100.
*   **Rollout and rollback**
    *   Salesforce: `sf project deploy start`; rollback redeploys the previous
        commit. No `destructiveChanges.xml` is used.
    *   Vercel: promote the previous deployment.
    *   Offerings are switched on or off with `Service__c.Active__c`.

## Additional Resources

*   [PRD: Points Shop on Salesforce](../prd.md)
*   [Email Functionality Restrictions for Trial Orgs and Developer Edition Orgs](https://help.salesforce.com/s/articleView?id=004633792&language=en_US&type=1)
*   [Developer Edition with Agentforce and Data Cloud](https://help.salesforce.com/s/articleView?language=en_US&id=xcloud.overview_developer_edition_agentforce_datacloud.htm&type=5)
*   [Agent API: Get Started](https://developer.salesforce.com/docs/ai/agentforce/guide/agent-api-get-started.html)
*   Review record: `consolidated_review_report.md`, `goldfish_review_report.md`

## Future Improvements

*   Delete resumes automatically 30 days after delivery.
*   Self-service data deletion and visitor self-cancel.
*   CI running Apex tests and storefront tests on every pull request, including
    Lighthouse CI.
*   A signed webhook from Salesforce for all emails if Flow email volume
    passes 10 a day.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

This plan covers **milestones 1 and 2** only. Milestones 3–6 get their own
plans, built on what milestones 1–2 deploy. Every file is new except
`docs/prd.md` (unchanged) and this design (updated as decisions change). Paths
are relative to the repository root. `FA` stands for
`salesforce/force-app/main/default`.

Until a Developer Edition org exists, the files can be checked only with
`npm run format:check` and review; each phase's exit check runs in the org.

### Phase 1: Salesforce foundation (milestone 1)

#### Project and docs

1.  **`README.md`** (Create) — What the project is, the system diagram, repo
    layout, how to deploy (link to the setup guide), status of each milestone.
2.  **`.gitignore`** (Create) — `node_modules`, `.sf`, `.sfdx`,
    `.localdevserver`, `.env*.local`, coverage, OS files.
3.  **`docs/setup-org.md`** (Create) — Sign up for Developer Edition with
    Agentforce; install the Salesforce CLI; `sf org login web --alias points-shop
    --set-default`; `npm install` and `npm run deploy` in `salesforce/`; assign
    `Shop_Admin` to yourself; `sf data import tree --plan data/plan.json`; run
    tests; (phase 2) create the integration user (Salesforce Integration user
    licence, profile "Minimum Access - API Only Integrations", permission set
    licence "Salesforce API Integration", then `Shop_Integration`), create an
    External Client App with the OAuth client credentials flow and that user as
    run-as user (fallback: a Connected App with the same settings if the org
    still allows creating one), and test `GET /catalog` with curl; monthly
    export command.
4.  **`docs/spike-agentforce.md`** (Create) — The milestone 1 Agentforce test:
    steps (enable Agentforce, create a test agent with one invocable action
    returning an input, add a `WalletId` context variable mapped to it, call
    the Agent API with client credentials, measure latency over 5 messages,
    count LLM requests in Setup, check Storage Usage before and after) and a
    results table to fill in, with the decision each result drives.

#### SFDX project

5.  **`salesforce/sfdx-project.json`** (Create) — Package directory
    `force-app` (default), `sourceApiVersion` `"65.0"`, namespace empty.
6.  **`salesforce/.forceignore`** (Create) — Ignores `**/jsconfig.json`,
    `**/.eslintrc.json`, `**/__tests__/**`, `.sfdx`, `.sf`.
7.  **`salesforce/package.json`** (Create) — Dev dependencies `prettier` 3 and
    `prettier-plugin-apex` 2. Prettier formats Apex only: the XML plugin broke
    validation-rule formulas (`&&` became `& &`) and was removed after the first
    deploy. Scripts: `format`, `format:check`
    (`prettier --check "force-app/**/*.{cls,trigger,xml}"`), `deploy`
    (`sf project deploy start --source-dir force-app --wait 20`), `test`
    (`sf apex run test --test-level RunLocalTests --code-coverage
    --result-format human --wait 20`), `seed`
    (`sf data import tree --plan data/plan.json`).
8.  **`salesforce/.prettierrc`** (Create) — Plugins `prettier-plugin-apex` and
    `@prettier/plugin-xml`; print width 100; XML whitespace sensitivity
    `ignore`.

#### Custom objects

Every object folder holds `<Object>.object-meta.xml` and one
`fields/<Field>.field-meta.xml` per field, one
`validationRules/<Rule>.validationRule-meta.xml` per rule and one
`listViews/<View>.listView-meta.xml` per list view. Name fields, sharing and
validation rules are as listed. Required master-detail and required fields are
left out of permission sets (the platform grants them).

9.  **`FA/objects/Service__c/`** — Label Offering. Name: Text (Offering Name).
    Sharing Read. Fields:
    `Slug__c` Text(60) required, unique, external ID;
    `Description__c` Long Text Area(2,000);
    `Points_Price__c` Number(6,0) required;
    `Fulfilment_Type__c` Picklist (Question, Resume, Booking) required;
    `Booking_Url__c` URL; `Delivery_Promise__c` Text(100);
    `Active__c` Checkbox default true; `Sort_Order__c` Number(3,0).
    Validation `Price_Positive`: `Points_Price__c <= 0`, message "Points price
    must be above zero." Validation `Booking_Url_Required`:
    `ISPICKVAL(Fulfilment_Type__c, 'Booking') && ISBLANK(Booking_Url__c)`,
    message "Booking offerings need a booking URL."
10. **`FA/objects/Earn_Task__c/`** — Name: Text (Task Name). Sharing Read.
    Fields: `Key__c` Text(40) required, unique, external ID;
    `Description__c` Text(255); `Points__c` Number(4,0) required;
    `Verification__c` Picklist (System, Form, Honour, Referral, Review)
    required; `Max_Per_Wallet__c` Number(3,0) required default 1;
    `Link_Url__c` URL; `Active__c` Checkbox default true;
    `Sort_Order__c` Number(3,0).
    Validation `Points_Positive`: `Points__c <= 0 || Max_Per_Wallet__c < 1`,
    message "Points and max per wallet must be at least 1."
11. **`FA/objects/Wallet__c/`** — Name: Auto Number `W-{00000}`. Sharing
    Private. Fields: `Email__c` Email required, unique, external ID;
    `Balance__c` Roll-Up Summary SUM(`Points_Ledger__c.Amount__c`);
    `Referral_Code__c` Text(8) unique; `Referred_By__c` Lookup(Wallet__c),
    delete constraint SetNull; `Last_Token_Issued_At__c` Number(18,0);
    `First_Sign_In_At__c` Date/Time.
    Validation `Balance_Not_Negative`: `Balance__c < 0`, message
    "INSUFFICIENT_POINTS: balance cannot go below zero."
12. **`FA/objects/Points_Ledger__c/`** — Label Points Ledger Entry. Name: Auto
    Number `L-{000000}`. Sharing ControlledByParent. Fields:
    `Wallet__c` Master-Detail(Wallet__c), not reparentable;
    `Amount__c` Number(6,0) required;
    `Entry_Type__c` Picklist (Earn, Redeem, Refund, Adjustment) required;
    `Reason__c` Text(255); `Idempotency_Key__c` Text(200) required, unique,
    external ID; `Task_Completion__c` Lookup(Task_Completion__c) SetNull;
    `Shop_Order__c` Lookup(Shop_Order__c) SetNull.
    Validation `Amount_Sign_Matches_Type`: `Amount__c = 0 ||
    (ISPICKVAL(Entry_Type__c,'Earn') && Amount__c < 0) ||
    (ISPICKVAL(Entry_Type__c,'Refund') && Amount__c < 0) ||
    (ISPICKVAL(Entry_Type__c,'Redeem') && Amount__c > 0)`, message "Earn and
    Refund entries are positive, Redeem entries negative, and no entry is
    zero." Adjustment may be either sign.
13. **`FA/objects/Task_Completion__c/`** — Name: Auto Number `TC-{000000}`.
    Sharing Private. Fields: `Wallet__c` Lookup(Wallet__c) required, Restrict;
    `Earn_Task__c` Lookup(Earn_Task__c) required, Restrict;
    `Completion_Key__c` Text(160) required, unique, external ID;
    `Evidence__c` Long Text Area(2,000); `Points_Awarded__c` Number(4,0).
14. **`FA/objects/Shop_Order__c/`** — Name: Auto Number `PS-{0000}`. Sharing
    Private. Fields: `Wallet__c` Lookup(Wallet__c) required, Restrict;
    `Service__c` Lookup(Service__c) required, Restrict (label Offering);
    `Order_Key__c` Text(160) required, unique, external ID;
    `Checkout_Key__c` Text(80) required; `Points_Spent__c` Number(6,0)
    required; `Status__c` Picklist (Awaiting Details default, In Progress,
    Delivered, Cancelled) required; `Question__c` Long Text Area(2,000);
    `Resume_Url__c` URL; `Booking_Uid__c` Text(100); `Booking_Start__c`
    Date/Time; `Delivered_At__c` Date/Time; `Cancelled_At__c` Date/Time;
    `Review_Rating__c` Number(1,0); `Review_Text__c` Long Text Area(1,000);
    `Customer_Email__c` Formula(Text) `Wallet__r.Email__c`.
    Validations:
    `Terminal_Status_Locked`: `ISCHANGED(Status__c) &&
    (ISPICKVAL(PRIORVALUE(Status__c),'Delivered') ||
    ISPICKVAL(PRIORVALUE(Status__c),'Cancelled'))`, message "Delivered and
    cancelled orders cannot change status.";
    `Delivered_Needs_Input`: `ISCHANGED(Status__c) &&
    ISPICKVAL(Status__c,'Delivered') &&
    ISPICKVAL(PRIORVALUE(Status__c),'Awaiting Details')`, message "Add the
    visitor's input (In Progress) before marking the order Delivered.";
    `Review_Only_When_Delivered`: `(ISCHANGED(Review_Rating__c) ||
    ISCHANGED(Review_Text__c)) && NOT(ISPICKVAL(Status__c,'Delivered'))`,
    message "Reviews can be added only to delivered orders.";
    `Review_Rating_Range`: `NOT(ISBLANK(Review_Rating__c)) &&
    (Review_Rating__c < 1 || Review_Rating__c > 5)`, message "Rating must be
    1 to 5."
    List views `Open_Orders` (Awaiting Details or In Progress) and
    `Delivered_Orders`.

#### App and access

15. **`FA/tabs/`** (Create) — `Service__c`, `Earn_Task__c`, `Wallet__c`,
    `Points_Ledger__c`, `Task_Completion__c`, `Shop_Order__c` custom object
    tabs.
16. **`FA/applications/Points_Shop.app-meta.xml`** (Create) — Lightning app with
    the six tabs, Shop Orders first.
17. **`FA/permissionsets/Shop_Admin.permissionset-meta.xml`** (Create) — App
    and tab visibility; full object access to all six objects except Points
    Ledger (read only); field read/edit on non-required fields; read on the
    roll-up and formula fields. (A System Administrator can still modify
    ledger rows through Modify All Data; the trigger blocks it.)

#### Apex

18. **`FA/classes/ShopException.cls`** — `public class ShopException extends
    Exception` with `public String code` and constructor `ShopException(String
    code, String message)`. Codes as in section 4. The one-argument
    constructors are never used.
19. **`FA/classes/TriggerHandler.cls`** — Virtual base. `run()` dispatches on
    `Trigger.operationType` to virtual `beforeInsert`, `beforeUpdate`,
    `beforeDelete`, `afterInsert`, `afterUpdate`, `afterDelete`,
    `afterUndelete`. Static `bypass(String handlerName)`,
    `clearBypass(String)`, `isBypassed(String)`; `run()` returns early when
    bypassed or outside a trigger context. Test hooks:
    `@TestVisible private System.TriggerOperation testOperation` and
    `@TestVisible private Boolean testIsExecuting`, used in place of
    `Trigger.operationType` and `Trigger.isExecuting` when set.
20. **`FA/classes/LedgerService.cls`** — `public inherited sharing class`.
    Inner `public class Posting { Id walletId; Integer amount; String
    entryType; String reason; String idempotencyKey; Id taskCompletionId; Id
    shopOrderId; }` with a constructor taking all fields. Methods:
    `public static List<Points_Ledger__c> postAll(List<Posting> postings)` and
    `public static Points_Ledger__c post(Posting p)`. Flag
    `public static Boolean isPosting { get; private set; }` (false by default),
    set to true just before the insert and reset in `finally`. Behaviour as in
    section 3; results returned in input order; `lockWallets(Set<Id>)` is
    public for other service classes. `Reason__c` values: "Task: <task
    name>", "Order <order number>", "Refund for <order number>", or the
    caller's text for Adjustment.
21. **`FA/classes/WalletTriggerHandler.cls`** — Before insert/update:
    lower-case `Email__c`; before insert: fill blank `Referral_Code__c` with 8
    characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, each picked with
    `Math.mod(Math.abs(Crypto.getRandomInteger()), 31)`.
22. **`FA/classes/PointsLedgerTriggerHandler.cls`** — Before insert: add an
    error to every row unless `LedgerService.isPosting`. Before update and
    before delete: add an error ("Ledger entries are append-only.") unless the
    handler is bypassed. (A wallet delete cascades to its entries without
    firing this trigger; that is the delete-wallet path.)
23. **`FA/triggers/WalletTrigger.trigger`**,
    **`FA/triggers/PointsLedgerTrigger.trigger`** — All events; body
    `new <Handler>().run();`.
#### Seed data

24. **`salesforce/data/plan.json`**, **`salesforce/data/Service__c.json`**,
    **`salesforce/data/Earn_Task__c.json`** (Create) — The two seed tables in
    section 2. Booking URLs are placeholders
    (`https://cal.com/your-handle/career-chat`,
    `https://cal.com/your-handle/mock-interview`) replaced during setup.
    LinkedIn task link URLs are placeholders too.

#### Tests

25. **`FA/classes/TestDataFactory.cls`** — `@IsTest`. `createCatalog()`
    inserts the seed offerings and tasks; `createWallet(String email, Integer
    startingPoints)` inserts a wallet and, if points > 0, an Adjustment entry
    through `LedgerService`; `createOrder(Id walletId, String slug, String
    status)` inserts an order with `Checkout_Key__c = 'test-' + n`,
    `Order_Key__c = walletId:test-n:slug`, `Points_Spent__c` = the offering's
    price, posts its Redeem entry through `LedgerService` (the wallet must hold
    enough points), then updates the status if it is not Awaiting Details
    (stepping through In Progress for Delivered).
26. **`FA/classes/TriggerHandlerTest.cls`** — Dispatch per operation; bypass
    stops dispatch; `run()` outside a trigger does nothing.
27. **`FA/classes/LedgerServiceTest.cls`** — Expected outcomes:
    post +50 → balance 50; same key twice → one entry, second call returns the
    first entry; debit 51 on balance 50 → `ShopException` code
    `INSUFFICIENT_POINTS`, balance still 50; direct `insert` of an entry →
    DML error; update and delete of an entry → DML error; wrong sign for type →
    DML error; `postAll` with 200 postings across 20 wallets in one
    transaction succeeds with `Limits.getQueries() <= 5` and
    `Limits.getDmlStatements() <= 3` used by the call.
28. **`FA/classes/WalletTriggerHandlerTest.cls`** — Upper-case email stored
    lower-case; referral code generated, 8 characters from the alphabet;
    duplicate email (any case) → DML error.

**Phase 1 exit check:** `npm run deploy` succeeds; `npm run test` passes with
the three test classes; `npm run seed` imports 4 offerings and 8 tasks;
`docs/spike-agentforce.md` results table is filled in.

### Phase 2: Earn and checkout (milestone 2)

#### Objects and access

30. **`FA/permissionsets/Shop_Integration.permissionset-meta.xml`** (Create) —
    For the API-only integration user: Apex class access to `ShopApi`; read on
    `Service__c` and `Earn_Task__c`; read, create, edit on `Wallet__c`,
    `Task_Completion__c`, `Shop_Order__c`; read, create on
    `Points_Ledger__c`; user permission `ApexRestServices`. No field
    permissions are needed because the service classes run in system mode.

#### Apex

31. **`FA/classes/CatalogService.cls`** — `inherited sharing`.
    `getCatalog()` returns active offerings and tasks sorted by
    `Sort_Order__c`, mapped to `ShopDtos.Offering` and `ShopDtos.Task`.
32. **`FA/classes/WalletService.cls`** — `inherited sharing`.
    `verifySignIn(String email, Long issuedAt, String referralCode)` returns
    `ShopDtos.VerifyResult`; `getWallet(Id walletId)` returns
    `ShopDtos.Wallet`. Email checked against a simple pattern (one `@`, a dot
    in the domain, ≤ 254 characters). A new wallet is inserted. Salesforce's
    `DUPLICATE_VALUE` error does not name the field (found when deploying), so
    on a duplicate the email is re-queried `FOR UPDATE`: a wallet found means a
    concurrent first sign-in and it is used as an existing wallet; none found
    means a referral-code clash, so the code is cleared (the trigger fills a new
    one) and the insert retried once. A `TASK_LIMIT_REACHED` from the referrer's
    `referral` award is caught and ignored, so the new visitor's sign-in still
    succeeds. Behaviour as in section 5.
33. **`FA/classes/EarnService.cls`** — `inherited sharing`.
    `completeTask(Id walletId, String taskKey, String evidence)` returns
    `ShopDtos.TaskResult`; `awardSystemTask(Id walletId, String taskKey,
    String ref)` returns the points awarded (0 on replay). Behaviour as in
    section 3.
34. **`FA/classes/CheckoutService.cls`** — `inherited sharing`.
    `checkout(Id walletId, String checkoutKey, List<String> slugs)` returns
    `ShopDtos.CheckoutResult`. Steps as in section 3. Test hook
    `@TestVisible static Boolean failAfterOrderInsert` throws
    `ShopException('INTERNAL', 'Forced failure')` after step 6.
35. **`FA/classes/OrderService.cls`** — `inherited sharing`.
    `listOrders(Id walletId)`, `getOrder(Id walletId, Id orderId)`,
    `saveDetails(Id walletId, Id orderId, String question, String resumeUrl)`,
    `saveBooking(Id walletId, Id orderId, String bookingUid, Datetime
    bookingStart)`, `submitReview(Id walletId, Id orderId, Integer rating,
    String text)`. An order of another wallet is `NOT_FOUND`. Behaviour as in
    section 3.
36. **`FA/classes/ShopDtos.cls`** — Inner classes matching section 4:
    `Offering`, `Task`, `LedgerEntry`, `Wallet`, `Order`, `Review`,
    `VerifyResult`, `TaskResult`, `CheckoutResult`, `OrderResult`,
    `ReviewResult`, `ErrorBody`, plus request classes `VerifyRequest`,
    `TaskRequest`, `CheckoutRequest`, `DetailsRequest`, `BookingRequest`,
    `ReviewRequest`. Mapping functions from records live here. The JSON keys
    `orderNumber` and `entryType` avoid Apex reserved words, so plain
    `JSON.serialize` produces the contract.
37. **`FA/classes/ShopApi.cls`** — `@RestResource(urlMapping='/shop/v1/*')
    global with sharing class`. One `@HttpGet` and one `@HttpPost` method;
    both split the path after `/shop/v1/`, match it against the route table in
    section 4, deserialise the body with `JSON.deserializeStrict` into the
    request class (failure → `VALIDATION`), call the service class, and
    serialise the result. `ShopException` maps to the status table; any other
    exception logs and returns 500 `INTERNAL`. An empty body on the task
    endpoint is allowed. Test hook `@TestVisible static Exception
    forceException` is thrown before dispatch when set.
38. **`FA/classes/ShopOrderTriggerHandler.cls`** — Before update: set
    `Delivered_At__c` when status becomes Delivered and `Cancelled_At__c` when
    it becomes Cancelled. After update: for orders that became Cancelled,
    query their Redeem entries and post one Refund per order through
    `LedgerService.postAll` (amount = −Redeem amount, key `refund:<orderId>`).
39. **`FA/classes/TaskCompletionTriggerHandler.cls`** — Before update and
    before delete: add an error ("Task completions are history.") unless
    bypassed.
40. **`FA/triggers/ShopOrderTrigger.trigger`**,
    **`FA/triggers/TaskCompletionTrigger.trigger`** — All events;
    `new <Handler>().run();`.
40a. **`salesforce/scripts/apex/delete-wallet.apex`** (Create; phase 2, because it bypasses `TaskCompletionTriggerHandler`) — Takes an email
    in a variable at the top; bypasses `TaskCompletionTriggerHandler`,
    deletes the wallet's completions and orders, then the wallet (cascading
    its ledger); prints counts.

#### Tests

41. **`FA/classes/WalletServiceTest.cls`** — New email → wallet created,
    balance 50, `isNew` true; same token again → `UNAUTHORIZED`; older token
    after a newer one → `UNAUTHORIZED`; newer token → succeeds, `isNew` false,
    balance unchanged; email stored lower-case; valid referral code →
    referrer +100 and `Referred_By__c` set; unknown code → ignored; code on an
    existing wallet → ignored; sixth referral → referrer balance unchanged;
    bad email → `VALIDATION`; a wallet inserted for the email just before the
    call (simulating a concurrent first sign-in) → existing-wallet path, no
    500.
42. **`FA/classes/EarnServiceTest.cls`** — `explore` → +30; `explore` again →
    `replay` true, +0; `signup`, `referral` or `review` through
    `completeTask` → `VALIDATION`; inactive task → `NOT_FOUND`; evidence over
    2,000 characters → `VALIDATION`; `awardSystemTask('review', orderId)`
    twice → +75 once; eleventh review award → `TASK_LIMIT_REACHED`.
43. **`FA/classes/CheckoutServiceTest.cls`** — Balance 100 buys
    `ask-sfcc-question` → one order, balance 0; balance 99 →
    `INSUFFICIENT_POINTS`, no order; two offerings → two orders, two Redeem
    entries; same key twice → `replay` true, still two orders; inactive or
    unknown slug → `NOT_FOUND`, no orders and no entries; duplicate slugs or
    five slugs → `VALIDATION`; a forced failure after the order insert rolls
    back orders and entries; inserting a second order with an existing
    `Order_Key__c` → DML duplicate error (the second guard).
44. **`FA/classes/OrderServiceTest.cls`** — Question on a Question order →
    In Progress; resume URL on a Question order → `VALIDATION`; details on
    another wallet's order → `NOT_FOUND`; details on an In Progress order →
    `INVALID_STATE`; booking saved on a Booking order; Piyush cancels →
    one Refund equal to the Redeem amount, balance restored; status change
    after Delivered or Cancelled → DML error; Delivered from Awaiting
    Details → DML error; review on a Delivered order → +75, review saved;
    same review again → `replay` true, +0; eleventh review →
    `TASK_LIMIT_REACHED` and that order's review not saved; review on an In
    Progress order →
    `INVALID_STATE`; rating 6 → `VALIDATION`.
45. **`FA/classes/ShopApiTest.cls`** — Each route through `RestContext` with
    expected status and JSON shape; each error code mapped to its HTTP status;
    unknown route → 404 `NOT_FOUND`; malformed JSON → 400 `VALIDATION`;
    unexpected exception → 500 `INTERNAL` with no stack trace in the body.
46. **`FA/classes/CatalogServiceTest.cls`** — Inactive rows excluded; sort
    order respected.

**Phase 2 exit check:** `npm run deploy` succeeds; `npm run test` passes with
org-wide coverage ≥ 90% and every class ≥ 85%; with the integration user and
Connected App from `docs/setup-org.md`, a client-credentials token fetched by
curl returns the catalogue from `GET /services/apexrest/shop/v1/catalog`.

### Verification Plan

*   **Formatting (before an org exists):** `npm run format:check` in
    `salesforce/`.
*   **Deploy:** `npm run deploy` (phase 1 and 2 exit checks).
*   **Unit tests:** `npm run test`; coverage ≥ 90% org-wide and ≥ 85% per class.
*   **Integration:** curl `GET /catalog` and `POST /auth/verify` with a
    client-credentials token (phase 2).
*   **Agentforce test:** results recorded in `docs/spike-agentforce.md`
    (phase 1); they set the milestone 5 plan.

--------------------------------------------------------------------------------

## Milestone 3 Implementation Plan (storefront)

Milestone 3 builds the Next.js storefront against the REST API in section 4.
Fulfilment inputs (question form, resume upload, Cal.com), the Flows and the
concierge are milestones 4 and 5; the order page in this milestone shows status
and next steps only. All paths are under `storefront/`.

### Decisions for this milestone

| Topic | Choice |
| --- | --- |
| Scaffold and versions | `create-next-app@16` (App Router, TypeScript, Tailwind CSS v4, ESLint, `src/` directory); the versions it installs are pinned in `package-lock.json`. Added: `jose`, `zod`, `resend`, `@marsidev/react-turnstile`; dev: `vitest`, `@playwright/test`. |
| Static public pages, dynamic header | Public pages (`/`, `/services/[slug]`, `/how-its-built`) read no cookies, so they stay ISR (`export const revalidate = 600`). The header is a client component that loads the visitor's email, balance and cart count from `GET /api/session` after the page renders. |
| Signed-in pages | `/cart`, `/orders`, `/orders/[id]`, `/account`, `/feedback`, `/contact` are dynamic server components; without a session they redirect to `/signin?next=<path>`. |
| Stub backend | Fixture catalogue identical to the seed data. Keeps wallets, balances and orders in a module-level `Map` (lost on restart) so the happy path works end to end. Enforces no limits or idempotency. Canned errors: a wallet whose email contains `+short` gets `INSUFFICIENT_POINTS` on checkout; one containing `+down` gets `UNAVAILABLE` on every call. |
| Turnstile in development | Cloudflare's published test keys (site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`) always pass. `.env.example` lists them as the local defaults. |
| Local email | When `RESEND_API_KEY` is unset, each email is written as JSON to `storefront/.local-email/<epoch-ms>-<kind>.json` (git-ignored) and logged. |
| Errors to the browser | Every `/api/*` route returns `{ error: { code, message } }` on failure. HTTP status: section 4's table, plus `UNAVAILABLE` → 503 and `UNAUTHORIZED` from a missing session → 401. |

### Environment (`src/lib/env.ts`)

Parsed with `zod` on first use inside a request (never at import or build
time). `SHOP_BACKEND` is `stub` or `salesforce`; `stub` is refused when
`VERCEL_ENV === 'production'`. Required always: `SITE_URL`, `SESSION_SECRET`
and `MAGIC_LINK_SECRET` (each ≥ 32 characters), `EMAIL_FROM`, `OWNER_EMAIL`,
`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. Required when
`SHOP_BACKEND=salesforce`: `SF_LOGIN_URL` (the org's My Domain URL),
`SF_CLIENT_ID`, `SF_CLIENT_SECRET`. Optional: `RESEND_API_KEY`, `BMAC_URL`,
`GITHUB_URL`, `LINKEDIN_URL`.

### Files

#### Project

1.  **`package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`,
    `eslint.config.mjs`** (Create, from the scaffold) — Scripts added: `test`
    (`vitest run`), `test:e2e` (`playwright test`), `check:bundle`
    (`node scripts/check-bundle.mjs`), `typecheck` (`tsc --noEmit`).
2.  **`.env.example`** (Create) — Every variable above with a comment; stub
    backend and Turnstile test keys as values; secrets left empty.
3.  **`.gitignore`** (Create, from the scaffold) — Adds `.local-email/`,
    `playwright-report/`, `test-results/`.
4.  **`vitest.config.ts`** (Create) — Node environment, `src/**/*.test.ts`, path
    alias `@/` → `src/`.
5.  **`playwright.config.ts`** (Create) — Starts `npm run dev` with
    `SHOP_BACKEND=stub` on port 3100; one Chromium project; `tests/e2e`.
6.  **`scripts/check-bundle.mjs`** (Create) — After `next build`, reads every
    file under `.next/static/`, fails if it contains any of `SF_CLIENT_SECRET`,
    `SESSION_SECRET`, `MAGIC_LINK_SECRET`, `TURNSTILE_SECRET_KEY`,
    `RESEND_API_KEY` (values from the environment, skipped when empty) or the
    host of `SF_LOGIN_URL`. Goal 3's check.

#### Library (`src/lib/`)

7.  **`env.ts`** — As above; `getEnv()` caches the parsed result.
8.  **`errors.ts`** — `class ShopError extends Error { code; status }`;
    `statusFor(code)`; `errorResponse(e)` returns `NextResponse.json({ error },
    { status })`, mapping unknown errors to 500 `INTERNAL` with a fixed
    message.
9.  **`backend/types.ts`** — Types transcribing section 4 (`Offering`, `Task`,
    `LedgerEntry`, `Wallet`, `Order`, `Catalog`, `VerifyResult`, `TaskResult`,
    `CheckoutResult`) and `interface ShopBackend { getCatalog();
    verifySignIn(email, issuedAt, referralCode?); getWallet(walletId);
    completeTask(walletId, taskKey, evidence?); checkout(walletId, checkoutKey,
    slugs); listOrders(walletId); getOrder(walletId, orderId) }`, all async.
10. **`backend/salesforce.ts`** — Token: `POST {SF_LOGIN_URL}/services/oauth2/token`
    with `grant_type=client_credentials`; cached in a module variable for 25
    minutes and dropped on a 401 (one retry). Calls `{instance_url from the
    token}/services/apexrest/shop/v1/...` with `AbortSignal.timeout(10000)`. A
    JSON body with `error.code` becomes `ShopError(code)`. A timeout, network
    error, 5xx, or a Salesforce error array whose `errorCode` is
    `REQUEST_LIMIT_EXCEEDED` or `STORAGE_LIMIT_EXCEEDED` becomes
    `ShopError('UNAVAILABLE')`.
11. **`backend/stub.ts`** — As in the decisions table. `verifySignIn` creates
    the wallet with 50 points on first sight and ignores `issuedAt`;
    `completeTask` adds the task's points; `checkout` subtracts and creates
    orders numbered `PS-0001`… in status Awaiting Details.
12. **`backend/fixtures.ts`** — The four offerings and eight tasks from the
    seed tables.
13. **`backend/index.ts`** — `getBackend()` returns the stub or Salesforce
    backend from `SHOP_BACKEND`.
14. **`session.ts`** — Cookie `ps_session`: HS256 JWT signed with
    `SESSION_SECRET`, claims `sub` (wallet ID) and `email`, 30-day expiry,
    `httpOnly`, `secure` outside development, `sameSite: 'lax'`, path `/`.
    `getSession()` returns `{ walletId, email } | null` (invalid or expired
    tokens count as none); `setSession`, `clearSession`.
15. **`magic-link.ts`** — `createToken(email, ref?)`: payload `{ email, iat,
    exp: iat + 15 min, ref }` as base64url JSON, then `.`, then base64url
    HMAC-SHA256 of the payload string with `MAGIC_LINK_SECRET`.
    `verifyToken(token)`: constant-time signature compare, expiry check;
    throws `ShopError('UNAUTHORIZED', 'This link is invalid or has
    expired.')`. `linkFor(token)` = `${SITE_URL}/auth/verify#token=${token}`.
16. **`cart.ts`** — Cookie `ps_cart` (`httpOnly`, 30 days): JSON `{ slugs:
    string[], checkoutKey: string }` validated with `zod` (unknown or invalid
    content counts as an empty cart). `addToCart(slug)` and
    `removeFromCart(slug)` ignore duplicates, cap at 4 slugs, and set a new
    `crypto.randomUUID()` checkout key whenever the contents change.
17. **`turnstile.ts`** — `verifyTurnstile(token, ip)`: `POST
    https://challenges.cloudflare.com/turnstile/v0/siteverify` (form body
    `secret`, `response`, `remoteip`); a missing token or `success: false`
    throws `ShopError('VALIDATION', 'Please complete the check.')`.
18. **`origin.ts`** — `assertSameOrigin(request)`: for POST/DELETE, the
    `Origin` header must equal the origin of `SITE_URL`; otherwise
    `ShopError('FORBIDDEN', 'Bad origin.')` with status 403.
19. **`email/templates.ts`** — Functions returning `{ subject, html, text }`
    for: magic link, welcome (balance, link to ways to earn), order confirmed
    (each order's number, offering, points and next step), new-order alert to
    `OWNER_EMAIL`, and a visitor message (feedback or contact) to `OWNER_EMAIL`
    with `reply_to` set to the visitor. User text is HTML-escaped.
20. **`email/send.ts`** — `sendEmail({ to, subject, html, text, replyTo })`:
    Resend when `RESEND_API_KEY` is set, else the local JSON file. Returns
    `true`/`false`; failures are logged, never thrown (section 6: best effort).
    The magic-link route treats `false` as `UNAVAILABLE`.
21. **`api.ts`** — `requireSession()` throws `ShopError('UNAUTHORIZED', 'Sign
    in first.')` (401); `readJson(request, schema)` parses with `zod` and throws
    `VALIDATION` on failure.

#### API routes (`src/app/api/`)

Every state-changing route calls `assertSameOrigin` first and never reads a
wallet ID from the request.

22. **`auth/link/route.ts`** — `POST { email, ref?, turnstileToken }`:
    Turnstile check, email format check (same pattern as Apex), create token,
    send the magic link. Returns `{ ok: true }` (the same response whether or
    not the email has a wallet).
23. **`auth/verify/route.ts`** — `POST { token }`: `verifyToken`, then
    `backend.verifySignIn(email, iat, ref)`, `setSession`, welcome email when
    `isNew`. Returns `{ ok: true, isNew }`.
24. **`auth/signout/route.ts`** — `POST`: clears the session. `{ ok: true }`.
25. **`session/route.ts`** — `GET`: `{ signedIn: false, cartCount }` or `{
    signedIn: true, email, balance, taskCounts, cartCount }`. `Cache-Control:
    no-store`. A backend error while signed in returns `signedIn: true` with
    `balance: null`.
26. **`cart/route.ts`** — `GET` → `{ slugs }`; `POST { slug }` adds (session
    required; unknown slugs rejected against the catalogue); `DELETE { slug }`
    removes. Both return `{ slugs }`.
27. **`checkout/route.ts`** — `POST`: session required; reads the cart; empty
    cart → `VALIDATION`; `backend.checkout(walletId, checkoutKey, slugs)`; on
    `replay: false` sends the order-confirmed email and the owner alert; clears
    the cart cookie; returns the `CheckoutResult`.
28. **`tasks/[key]/route.ts`** — `POST { message?, turnstileToken? }`: session
    required. `explore`, `linkedin-post`, `linkedin-hi`: completed with no
    evidence. `feedback`, `email-piyush`: Turnstile check, message 10–2,000
    characters, message emailed to Piyush, then completed with the message as
    evidence. Any other key → `VALIDATION`. Returns the `TaskResult`.

#### Pages and components (`src/app/`, `src/components/`)

29. **`app/layout.tsx`, `app/globals.css`** — Tailwind theme (warm neutral
    palette, one accent colour), `Header`, `Footer`, `ExploreTracker`, metadata.
30. **`components/Header.tsx`** (client) — Site name, links (Shop, How it's
    built, Orders and Account when signed in), balance pill and cart count from
    `/api/session`, Sign in / Sign out. Listens for a `shop:refresh` window
    event to reload after actions.
31. **`components/Footer.tsx`** — "A personal portfolio project, no uptime
    promises", privacy note (what is stored; email Piyush to delete), Buy Me a
    Coffee and GitHub links when set.
32. **`app/page.tsx`** (ISR) — Hero line in Piyush's friendly voice, grid of
    `OfferingCard`s, `EarnPanel`, `RefCapture`.
33. **`components/OfferingCard.tsx`**, **`components/AddToCartButton.tsx`**
    (client; POST `/api/cart`, then `shop:refresh`; on 401 goes to
    `/signin?next=<current path>`).
34. **`components/EarnPanel.tsx`** (client) — Lists tasks with points. Honour
    LinkedIn tasks: a button that opens the link in a new tab and posts to
    `/api/tasks/<key>`; explore: a hint ("visit three pages including How it's
    built"); Form tasks link to `/feedback` or `/contact`; referral: "your link
    is on your account page"; signup and review: information only. Shows
    "done" for tasks whose `taskCounts` reached `maxPerWallet`.
35. **`components/ExploreTracker.tsx`** (client, in the layout) — Records
    distinct visited paths in `sessionStorage`; on `/how-its-built` with three
    or more distinct paths and a signed-in visitor, posts `/api/tasks/explore`
    once per browser session (honour system).
36. **`components/RefCapture.tsx`** (client) — On the home page, stores `?ref=`
    in `localStorage` as `ps_ref`.
37. **`app/services/[slug]/page.tsx`** (ISR, `generateStaticParams` from the
    catalogue, `dynamicParams = true`) — Description, points, delivery promise,
    add to cart; unknown slug → `notFound()`.
38. **`app/cart/page.tsx`** + **`components/CartView.tsx`** (client) — Lines,
    total, balance, remove buttons, checkout button disabled when short ("You
    need N more points"); on success goes to `/orders?placed=1`.
39. **`app/orders/page.tsx`** — Order list (number, offering, status, date);
    `?placed=1` shows "Order placed. Check your email."
40. **`app/orders/[id]/page.tsx`** — Status, points, created date, and a next
    step line per fulfilment type; unknown or another wallet's order →
    `notFound()`.
41. **`app/account/page.tsx`** — Email, balance, referral link
    (`${SITE_URL}/?ref=<code>`), last 20 ledger entries.
42. **`app/signin/page.tsx`** + **`components/SignInForm.tsx`** (client) —
    Email field, Turnstile widget, submit to `/api/auth/link` with `ref` from
    `localStorage`; success message "Check your inbox". The `next` query value
    is stored in `sessionStorage` for the verify page (only paths starting
    with `/` are accepted).
43. **`app/auth/verify/page.tsx`** (client) — Reads `#token=` from
    `location.hash`, removes it from the URL, shows a "Sign in" button that
    posts to `/api/auth/verify`; on success clears `ps_ref` and goes to the
    stored `next` path or `/`.
44. **`app/feedback/page.tsx`**, **`app/contact/page.tsx`** +
    **`components/MessageForm.tsx`** (client) — Text area, Turnstile, posts to
    `/api/tasks/feedback` or `/api/tasks/email-piyush`.
45. **`app/how-its-built/page.tsx`** (ISR) — Architecture diagram (inline SVG
    of section 2's overview), order lifecycle, the SFCC mapping table from
    section 9, GitHub link. Milestone 6 polishes it.
46. **`components/ErrorNotice.tsx`** — Shows the Goal 9 message for
    `UNAVAILABLE`, otherwise the error message.

#### Tests

47. **`src/lib/*.test.ts`** (Vitest) — `magic-link` (round trip; tampered
    payload, wrong signature, expired → `UNAUTHORIZED`); `session` (round trip,
    expired, tampered); `cart` (add, duplicate ignored, cap of 4, key rotates on
    change, bad cookie → empty); `origin` (match, mismatch, missing);
    `turnstile` (mocked fetch success and failure).
48. **`src/lib/backend/salesforce.test.ts`** — Mocked `fetch`: token cached and
    reused; 401 drops the token and retries once; `{ error }` body → that code;
    timeout, 503 and `REQUEST_LIMIT_EXCEEDED` → `UNAVAILABLE`.
49. **`src/app/api/routes.test.ts`** — Calls route handlers with `Request`
    objects on the stub backend (cookies mocked): a body containing `walletId`
    is ignored (the session's wallet is used); a bad `Origin` → 403; no session
    → 401; `tasks/signup` → 400; checkout clears the cart and returns orders.
50. **`tests/e2e/visitor-journey.spec.ts`** (Playwright, stub) — Sign in (magic
    link read from the newest magic-link file in `.local-email/`), complete the
    explore and LinkedIn tasks to reach 100 points, add Ask an SFCC developer to
    the cart, check out, see the order in Awaiting Details.

### Review resolutions (milestone 3)

Two Goldfish reviewers (implementation readiness, codebase details) checked this
plan on 2026-11-12. The scaffold also showed that Next.js 16.4 enables Cache
Components by default. These rules override the items above where they differ.

| Topic | Resolution |
| --- | --- |
| Cache Components | Kept on (scaffold default). `export const revalidate` is not allowed with it. The catalogue is fetched by `getCachedCatalog()` in `src/lib/catalog.ts` with `'use cache'` and `cacheLife({ stale: 300, revalidate: 600, expire: 2592000 })`. Pages that read cookies do so inside `<Suspense>`. |
| Public pages and outages | Public pages never catch backend errors, so a failed background refresh keeps the last good page (Goal 9). The build prerenders public pages, so the build needs the backend; if Salesforce is down at build time the build fails and Vercel keeps the previous deployment. |
| Signed-in pages and outages | Each signed-in page wraps its backend calls in `try/catch`: `UNAVAILABLE` (and any other `ShopError`) renders `ErrorNotice`; an unknown wallet (`NOT_FOUND` from `getWallet`) redirects to `/signin?reason=expired`. `/api/session` clears the session cookie on `NOT_FOUND`. |
| Stub | State lives on `globalThis.__pointsShopStub`. Unknown wallet → `NOT_FOUND`. `STUB_FAIL=catalog` makes `getCatalog` throw `UNAVAILABLE`; `STUB_FAIL=all` makes every call throw it. |
| Salesforce error mapping (in order) | 1. Timeout or network error → `UNAVAILABLE`. 2. 401 whose body is an array containing `errorCode: 'INVALID_SESSION_ID'` → drop the token, fetch a new one, retry once. 3. Array body with `REQUEST_LIMIT_EXCEEDED` → `UNAVAILABLE`; other array bodies → `UNAVAILABLE` for 5xx, `INTERNAL` otherwise. 4. Object body with `error.code` → that code, except `INTERNAL`, which becomes `UNAVAILABLE` (it also covers `STORAGE_LIMIT_EXCEEDED`, which Apex reports as `INTERNAL`). 5. Any other non-2xx → `UNAVAILABLE` for 5xx, `INTERNAL` otherwise. Token endpoint failures → `UNAVAILABLE` plus a log line. Backend calls use `cache: 'no-store'` on the `fetch`; caching happens only in `getCachedCatalog()`. |
| Request bodies | `checkout(walletId, key, slugs)` sends `{ checkoutKey, offerings: slugs }`. Bodies carry only the keys in section 4, because `ShopApi` uses `JSON.deserializeStrict`. |
| Magic-link times | `iat = Date.now()` (epoch milliseconds), `exp = iat + 900000`; `issuedAt` sent to Apex is that `iat`. Signature compare checks lengths before `timingSafeEqual`; a mismatch is `UNAUTHORIZED`. |
| Async request APIs | `cookies()`, `params` and `searchParams` are awaited; `getSession`, `setSession`, `clearSession` and the cart helpers are `async`. |
| `useSearchParams` | Not used. `RefCapture` and `SignInForm` read `window.location.search` in `useEffect`. |
| Resend | `const { error } = await resend.emails.send({ from, to, subject, html, text, replyTo })`; returns `!error`; network errors caught. Local JSON files hold `{ kind, to, subject, text, html, replyTo }`. On Vercel (`VERCEL_ENV` set) `RESEND_API_KEY` is required. |
| Turnstile | Client IP = first entry of `x-forwarded-for`. A network error or non-200 from siteverify → `UNAVAILABLE`. |
| Cart cap | Adding a fifth offering → `VALIDATION` ("Your cart holds up to 4 offerings."). |
| Feedback and contact | The task is awarded even if the email to Piyush fails, because the message is saved as evidence in Salesforce. |
| Vercel previews | `SITE_URL` is `https://${VERCEL_BRANCH_URL}` when `VERCEL_ENV === 'preview'`; test previews on the branch URL only. Preview uses the Turnstile test keys, `SHOP_BACKEND=salesforce`, the `SF_*` values, and Resend's `onboarding@resend.dev` sender (which only delivers to the Resend account owner) until a domain exists. |
| Playwright | `webServer: { command: 'npx next dev -p 3100', url: 'http://localhost:3100', reuseExistingServer: !process.env.CI, env: { SHOP_BACKEND: 'stub', SITE_URL: 'http://localhost:3100', SESSION_SECRET, MAGIC_LINK_SECRET (fixed 40-character test values), EMAIL_FROM, OWNER_EMAIL, Turnstile test keys, RESEND_API_KEY: '' } }`, `use.baseURL` the same URL. |
| Route tests | `vi.mock('next/headers')` with a fake cookie store backed by a `Map` (`get`, `set`, `delete`); assertions read that store. `vi.mock('server-only', () => ({}))`. |
| Goal 3 bundle check | `check:bundle` runs after a build made with non-empty test values for every secret (`npm run build:check`), fails if any secret value or the token pattern `00D[A-Za-z0-9]{12,15}![A-Za-z0-9._]+` appears in `.next/static`, and fails if no secret values were provided. |
| Real-org smoke test | `src/lib/backend/salesforce.smoke.test.ts`, run only when `SMOKE=1` and the `SF_*` values are set: catalogue, verify with a `+smoke-<uuid>@example.com` address, wallet, one task, orders list; checks response shapes. Not part of `npm test`. |
| Goal 9 test | Route test: `/api/session` with `STUB_FAIL=all` returns `balance: null`; unit test: `getCachedCatalog` propagates `UNAVAILABLE` (so ISR keeps the stale page). |
| Phases | Phase A: library and unit tests (`npm test`, `npm run typecheck`). Phase B: API routes and route tests (same checks). Phase C: pages, components, e2e (`npm run lint`, `npm run build`, `npm run test:e2e`, `npm run build:check`). |

### Exit check

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`,
`npm run check:bundle` and `npm run test:e2e` pass locally. With the org from
milestones 1–2 and `SHOP_BACKEND=salesforce`, CUJ 1 works on a Vercel preview.

--------------------------------------------------------------------------------

## Milestone 4 Implementation Plan (fulfilment)

Milestone 4 lets visitors give what each order needs, lets Piyush deliver or
cancel in Salesforce with an email to the visitor, and collects reviews (CUJ 2,
CUJ 4). The Apex endpoints (`details`, `booking`, `review`) already exist from
milestone 2. Paths: `FA` = `salesforce/force-app/main/default`, `SF` =
`storefront/src`.

### Decisions for this milestone

| Topic | Choice |
| --- | --- |
| Flow failure alert | Each Flow's Send Email action has a fault path that creates a high-priority Task for the user who changed the status (subject names the order and email), so the save still commits. (Review: without it, a failed email would roll back the status change and the refund.) |
| Storefront URL in Flow emails | Custom label `Shop_Storefront_Url` (default `https://points-shop.vercel.app`), changed in Setup → Custom Labels once the domain is known. |
| Visitor email address in Flows | `$Record.Wallet__r.Email__c` (cross-object reference in the Flow, not the formula field). |
| Resume upload without Blob | When `BLOB_READ_WRITE_TOKEN` is unset (local development), the order page shows "Resume upload isn't configured here" and the route returns `UNAVAILABLE`. |
| Cal.com webhook without secret | When `CALCOM_WEBHOOK_SECRET` is unset, the webhook route returns 503 and saves nothing. |
| Booking link | `bookingUrl` from the catalogue plus `?email=<email>&metadata[walletId]=<id>&metadata[orderId]=<id>`. The webhook trusts these only after Apex confirms the order belongs to that wallet. |

### Files

#### Salesforce

1.  **`FA/labels/CustomLabels.labels-meta.xml`** (Create) — Label
    `Shop_Storefront_Url`, value `https://points-shop.vercel.app`, protected
    false.
2.  **`FA/flows/Order_Delivered.flow-meta.xml`** (Create) — Record-triggered,
    after save, on update of `Shop_Order__c`, entry condition `Status__c` equals
    `Delivered` and "only when a record is updated to meet the condition".
    One action: Send Email (`emailSimple`) to `$Record.Wallet__r.Email__c`,
    subject "Delivered: {order number}, {offering name}", plain-text body (text
    template) thanking the visitor, inviting a review for 75 points, with the
    link `{Shop_Storefront_Url}/orders/{record Id}`.
3.  **`FA/flows/Order_Cancelled.flow-meta.xml`** (Create) — Same shape for
    `Status__c` equals `Cancelled`; body says the order was cancelled and the
    points were returned, with a link to the account page.
4.  **`FA/classes/OrderFlowsTest.cls`** (Create) — Moving an order to Delivered
    and to Cancelled succeeds with the Flows active (they must not throw in
    tests); `Limits.getEmailInvocations()` increases by one for each.

#### Storefront

5.  **`storefront/package.json`, `package-lock.json`** (Modify) — Add
    `@vercel/blob` `^2.9.0`.
5a. **`SF/lib/backend/types.ts`** (Modify) — Add to `ShopBackend`:
    `saveDetails(walletId, orderId, { question } | { resumeUrl })`,
    `saveBooking(walletId, orderId, bookingUid, bookingStart)`,
    `submitReview(walletId, orderId, rating, text?)` returning `{ order,
    pointsAwarded, replay, balance }`.
6.  **`SF/lib/backend/salesforce.ts`**, **`SF/lib/backend/stub.ts`** (Modify)
    — Implement the three calls (`POST .../details`, `.../booking`,
    `.../review`). The stub moves Awaiting Details → In Progress, and records a
    review on Delivered orders (+75 once). The stub gains a test-only
    `deliverForTests(orderId)`.
7.  **`SF/lib/env.ts`** (Modify) — Optional `BLOB_READ_WRITE_TOKEN`,
    `CALCOM_WEBHOOK_SECRET`.
8.  **`SF/lib/resume-url.ts`** (Create) — `isIssuedResumeUrl(url, orderId)`:
    https, host ends with `.public.blob.vercel-storage.com`, path starts with
    `/resumes/<orderId>/`, ends with `.pdf`.
9.  **`SF/app/api/orders/[id]/details/route.ts`** (Create) — `POST {
    question }` or `{ resumeUrl }`; origin check, session; a resume URL must pass
    `isIssuedResumeUrl`; calls `saveDetails`; returns `{ order }`.
10. **`SF/app/api/orders/[id]/review/route.ts`** (Create) — `POST { rating,
    text? }`; origin check, session; returns the review result.
11. **`SF/app/api/resume-upload/route.ts`** (Create) — `handleUpload` from
    `@vercel/blob/client`. For the browser's token request (the Origin check
    applies only to that event type): session required, `clientPayload` is `{
    orderId }`, the order must belong to the session wallet, be Awaiting Details
    and be a Resume order; token options `allowedContentTypes:
    ['application/pdf']`, `maximumSizeInBytes: 5242880`, `addRandomSuffix:
    true`, and the pathname must start with `resumes/<orderId>/`.
    `onUploadCompleted` only logs (it is not called on localhost).
12. **`SF/app/api/webhooks/calcom/route.ts`** (Create) — Reads the raw body,
    verifies `X-Cal-Signature-256` (hex HMAC-SHA256 with
    `CALCOM_WEBHOOK_SECRET`, constant-time). On `triggerEvent ===
    'BOOKING_CREATED'` reads `payload.metadata.walletId`,
    `payload.metadata.orderId`, `payload.uid`, `payload.startTime` and calls
    `saveBooking`. Any `ShopError` (wrong wallet, not a booking order, wrong
    status, missing metadata) is logged and answered 200 so Cal.com does not
    retry; `UNAVAILABLE` and `INTERNAL` → 503 so Cal.com retries (a repeat is a
    replay in `saveBooking`); other events, including reschedules (accepted
    limitation), → 200 ignored; bad signature → 401. No Origin check.
13. **`SF/components/FulfilmentForm.tsx`** (Create, client) — By offering type
    on an Awaiting Details order: Question (textarea 20–2,000, posts to
    `details`); Resume (file input, PDF ≤ 5 MB, `upload()` from
    `@vercel/blob/client` with `handleUploadUrl: '/api/resume-upload'` and
    `clientPayload: JSON.stringify({ orderId })`, pathname
    `resumes/<orderId>/resume.pdf`, then posts the returned URL to `details`);
    Booking (button opening the prefilled Cal.com link in a new tab and a note
    that the page updates once booked). Refreshes the page on success.
14. **`SF/components/ReviewForm.tsx`** (Create, client) — On Delivered orders
    without a review: 1–5 star radio group and optional text (≤ 1,000), posts to
    `review`, shows "+75 points" on success. Shows the saved review otherwise.
15. **`SF/app/orders/[id]/page.tsx`** (Modify) — Uses the two forms; shows the
    submitted question, resume link or booking time on In Progress orders. The
    booking URL comes from `getCachedCatalog()` by `order.offering.slug` (Goal 9
    message if missing); the link is built with `new URL()` and
    `searchParams.set` using `session.email` and `session.walletId`. The "form
    arrives soon" text is removed.
16. **`SF/app/api/orders.test.ts`** (Create) — Route tests on the stub: question
    saved and status In Progress; a resume URL on another host or for another
    order → 400; review +75 once on a delivered order; Cal.com webhook with a
    good signature saves the booking, bad signature → 401, unknown order → 200
    and nothing saved.
17. **`SF/lib/resume-url.test.ts`** (Create) — Accepted and rejected URLs.
18. **`storefront/.env.example`**, **`docs/setup-vercel.md`** (Modify) — The
    two new variables; Blob store and Cal.com webhook setup steps.

### Exit check

Salesforce: deploy succeeds and all Apex tests pass. Storefront: lint,
typecheck, unit and route tests, build and the e2e journey pass. Live (after
Vercel setup): a question order goes Awaiting Details → In Progress, Piyush
marks it Delivered in Salesforce, the visitor gets the delivered email and can
review for +75 points.

--------------------------------------------------------------------------------

## Milestone 5 Implementation Plan (concierge)

Milestone 5 adds the Agentforce concierge (Goal 6, CUJ 5) using what the
milestone 1 test proved: an Agent Script state variable seeded when the session
starts can feed action inputs and the model cannot change it. Paths: `FA` =
`salesforce/force-app/main/default`, `SF` = `storefront/src`.

### Decisions for this milestone

| Topic | Choice |
| --- | --- |
| Authoring | Agent Script authoring bundle `Points_Shop_Concierge`, published with `sf agent publish authoring-bundle` and activated with `sf agent activate`. |
| Wallet binding | State variables `WalletId` and `SessionKey` (`mutable string`), seeded by the storefront server in the Agent API start-session `variables`. Every action takes them with `with walletId=@variables.WalletId` / `with sessionKey=@variables.SessionKey`; no action sets them. |
| Running user | The agent user created in the milestone 1 test (Einstein Agent licence). Permission set `Shop_Agent` grants class access to the three action classes only. |
| Sharing | Action classes are `without sharing` and filter every query by the bound wallet ID; they call the existing service classes, so all points rules still apply. |
| Agent API access | Same External Client App and integration user; scopes `chatbot_api` and `sfap_api` added, and JWT-based access tokens turned on (Agent API requirements). Calls go to `https://api.salesforce.com/einstein/ai-agent/v1`. |
| Session lifetime | One agent session per chat panel opening, kept in an `httpOnly` cookie `ps_chat` (session ID); the `SessionKey` is a fresh UUID per agent session. An expired or unknown session is restarted once. |
| Latency | Replies take about 10–11 s. The route sets `export const maxDuration = 30`; the panel shows a "thinking" state and starts the session when it opens. |
| Stub | With `SHOP_BACKEND=stub`, a rule-based stub concierge answers balance, earn and catalogue questions from the stub backend, so the panel works locally and in e2e tests. |

### Files

#### Salesforce

1.  **`FA/classes/ConciergeGetBalance.cls`** — Invocable "Concierge: Get
    balance". Input `walletId` (required). Outputs `balance` (Integer) and
    `summary` (the last 5 ledger reasons and amounts as text).
2.  **`FA/classes/ConciergeGetCatalog.cls`** — Invocable "Concierge: Get
    catalogue". Input `walletId` (optional). Outputs `offerings` (text: name,
    points, delivery promise, one line each), `tasksLeft` (text: tasks the wallet
    can still complete with their points) and `balance` (Integer, 0 without a
    wallet).
3.  **`FA/classes/ConciergeStartOrder.cls`** — Invocable "Concierge: Start
    order". Inputs `walletId`, `sessionKey` (both bound), `offeringSlug` (from
    the model). Calls `CheckoutService.checkout(walletId, 'agent:' + sessionKey
    + ':' + slug, [slug])`, so a repeat in the same chat is a replay. Outputs
    `success` (Boolean), `orderNumber`, `balance`, `message` (the reason when it
    fails, e.g. not enough points).
4.  **`FA/classes/ConciergeActionsTest.cls`** — Balance and summary; catalogue
    with and without a wallet; order succeeds once and repeats as a replay; not
    enough points → `success` false with a message; unknown wallet → message,
    no exception.
5.  **`FA/permissionsets/Shop_Agent.permissionset-meta.xml`** — Class access to
    the three action classes.
6.  **`FA/aiAuthoringBundles/Points_Shop_Concierge/`** — `.agent` and
    `.bundle-meta.xml`. System instructions in Piyush's friendly tone; one
    subagent "shop_help" with the three actions; instructions: answer only shop
    questions, recommend from the catalogue output, confirm the offering and
    points before calling start_order, never promise beyond the delivery
    promise, never ask for or use a wallet ID from the user.
7.  **`salesforce/org-setup/external-client-app/step1/...ecaOauth`** (Modify) —
    Add the Agent API scopes; document the JWT setting in
    `salesforce/org-setup/README.md`.

#### Storefront

8.  **`SF/lib/backend/salesforce.ts`** (Modify) — Export `getAccessToken()`
    (the cached client-credentials token) for the Agent API client.
9.  **`SF/lib/concierge/types.ts`** — `interface Concierge { start(session):
    Promise<string>; send(sessionId, text): Promise<string>; end(sessionId) }`.
10. **`SF/lib/concierge/agent-api.ts`** — Start: `POST
    /agents/{SF_AGENT_ID}/sessions` with `externalSessionKey`, `instanceConfig.
    endpoint` (the token's instance URL), `streamingCapabilities.chunkTypes:
    ['Text']`, `bypassUser: true` and `variables` `WalletId`, `SessionKey`
    (Text). Send: `POST /sessions/{id}/messages` with `message: { sequenceId,
    type: 'Text', text }`, returns the joined `messages[].message`. End: `DELETE
    /sessions/{id}` with header `x-session-end-reason: UserRequest`. 429 →
    `ShopError('UNAVAILABLE', busy text)`; 404 on send → `ShopError('NOT_FOUND')`
    (session gone); timeout 25 s.
11. **`SF/lib/concierge/stub.ts`** — Rule-based replies (balance, earn, offerings,
    order requests answered with "open the cart").
12. **`SF/lib/concierge/index.ts`** — `getConcierge()` by `SHOP_BACKEND`.
13. **`SF/lib/env.ts`** (Modify) — `SF_AGENT_ID` required when
    `SHOP_BACKEND=salesforce` and the concierge is used (checked in the route).
14. **`SF/app/api/concierge/route.ts`** — `export const maxDuration = 30`. `POST
    { message }` (1–500 characters): origin check, session; starts a session if
    `ps_chat` is missing, sends the message, restarts once on `NOT_FOUND`;
    returns `{ reply }`. `DELETE`: ends the session and clears the cookie.
15. **`SF/components/ConciergePanel.tsx`** — Client component in the layout,
    shown to signed-in visitors: a "Ask the concierge" button bottom-right opens
    a panel with the conversation, a text box, a "thinking…" state, the busy
    message on `UNAVAILABLE`, and `refreshShop()` after each reply (an order may
    have changed the balance). Closing the panel sends `DELETE`.
16. **`SF/lib/concierge/agent-api.test.ts`** — Mocked fetch: start body has the
    two variables; send joins messages; 429 → `UNAVAILABLE`.
17. **`SF/app/api/concierge.test.ts`** — Route on the stub: no session → 401;
    reply returned; message over 500 characters → 400; the cookie holds the
    session and `DELETE` clears it.

### Exit check

All Apex tests pass; the agent is published and active; storefront checks pass;
against the org, a signed-in visitor asks for the balance, asks what to buy, and
orders from chat; the order appears in Salesforce and the balance updates.
