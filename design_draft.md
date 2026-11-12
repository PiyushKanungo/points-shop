# Points Shop v1

*   **Author:** PiyushKanungo
*   **Status:** Draft
*   **Date:** 2026-11-12
*   **Predecessor:** [PRD: Points Shop on Salesforce](./docs/prd.md)

--------------------------------------------------------------------------------

## Overview

Points Shop is a personal web shop where visitors earn points by doing small,
mostly verifiable things (signing up, giving feedback, referring a friend) and
spend those points on four real services that Piyush delivers by hand: an SFCC
question answered by email, a resume review, a 20-minute career chat, and a
45-minute mock interview. No money changes hands in v1.

The shop has two parts:

*   **Back end on Salesforce.** A free Developer Edition org holds all data and
    rules: the service catalogue, one wallet per email address, an append-only
    points ledger, earning rules, and orders. Apex classes enforce the rules,
    Apex REST endpoints expose them, Flows send the emails, and an Agentforce
    agent answers visitor questions.
*   **Front end on Vercel.** A Next.js site shows the catalogue, the ways to
    earn, the visitor's balance, a cart, and order pages. Only the Next.js
    server talks to Salesforce. The browser never holds Salesforce credentials.

The project is a portfolio piece. Its job is to show recruiters for headless
SFCC roles a working, headless commerce system that Piyush built and runs.

## The Problem

Piyush's work history is SFRA (the older, server-rendered SFCC storefront).
Employers hiring for SFCC in late 2026 ask for headless experience: PWA Kit or
Storefront Next, with a separate front end calling commerce APIs. He has no
public code that shows this, and an individual cannot get a B2C Commerce
sandbox to build one on SFCC itself.

A generic demo store does not fix this. Recruiters see many re-skinned
templates, and a store with fake products and no users proves only that the
template runs. Two things make a portfolio project credible:

1.  **It is real.** Real visitors use it and real orders get delivered.
2.  **The architecture matches the job.** A separate front end calls a
    commerce back end through an API, with the same concepts SFCC uses:
    catalogue, price book, basket, order, order status, loyalty balance.

The proposed solution meets both. The services are real, so orders are real.
The architecture is headless: Next.js in front, Salesforce behind it, and a
REST API between them that mirrors SCAPI's basket-to-order flow.

**Weak points in this framing, stated up front:**

*   **Salesforce Platform is not SFCC.** Apex, custom objects and Flows are a
    different product from B2C Commerce (no cartridges, no Business Manager, no
    SCAPI). A recruiter screening for SFCC may discount this. The design
    reduces that risk by documenting each SFCC equivalent on the "How it's
    built" page, but it cannot remove it. The other two portfolio projects
    cover SFCC directly.
*   **Real usage is not guaranteed.** If nobody orders, the "it is real" claim
    fails. The success targets (10 delivered services, 50 sign-ups in three
    months) depend on Piyush promoting the shop, not on the software.
*   **Developer Edition is not a production service.** Salesforce can change
    its limits or terminate an org that goes 45 days without a login. The site
    must say it is a portfolio project and must fail politely when Salesforce
    is unavailable or rate-limited.
*   **Free help may conflict with Piyush's employment contract.** If Capgemini
    forbids side work, the services cannot launch as designed. This does not
    change the software, but it can block launch.

## Goals

Each goal is something the v1 build must do. A goal is met when its check
passes.

1.  **A visitor can go from landing to a placed order without help.**
    Check: a new visitor signs in by magic link, gets 50 welcome points, earns
    enough points through tasks for the 100-point service, and places that order.
2.  **Points cannot be created or spent wrongly.**
    Check: Apex tests show that a wallet balance never goes below zero, that the
    same checkout or task completion sent twice only counts once, and that each
    task's per-wallet limit holds. The only way to change a balance is a new
    ledger entry; ledger entries cannot be edited or deleted.
3.  **Salesforce is reachable only through the Next.js server.**
    Check: no Salesforce token, client secret or org URL appears in any
    JavaScript sent to the browser.
4.  **Piyush can fulfil every order from the Salesforce app.**
    Check: for each of the four services he can see the order, the visitor's
    input (question text, resume link or booking), and mark it Delivered. The
    visitor then gets an email.
5.  **The visitor gets an email at each step that matters.**
    Check: welcome, order confirmed (with what to do next) and order delivered
    emails are sent by record-triggered Flows.
6.  **A visitor can ask the concierge about their balance, how to earn, and
    which service fits, and can start an order from the chat.**
    Check: the Agentforce agent answers these through Apex actions that read
    the visitor's own wallet and no one else's.
7.  **A recruiter can understand the system in two minutes.**
    Check: the "How it's built" page shows the architecture, the order
    lifecycle and the SFCC mapping table, and links to the GitHub repository.
8.  **The code meets a professional bar a reviewer can verify.**
    Check: Apex test coverage is 90% or more across the org's custom Apex,
    triggers go through one handler framework, and mobile Lighthouse scores on
    the shop pages are Performance 90 or more and Accessibility 100.
9.  **The site degrades politely.**
    Check: when Salesforce is down, the org's API limit is reached, or the
    Agentforce limit (150 requests per hour) is hit, the visitor sees a plain
    message and the rest of the page still works.

## Non-Goals

*   **No payments.** Points are the only currency in v1. Razorpay is listed as
    later work in the PRD.
*   **No SFCC back end.** It needs an enterprise licence; individuals cannot get
    a B2C Commerce sandbox.
*   **No physical goods, shipping, inventory or tax.**
*   **No files in Salesforce.** The org has about 5 MB of data storage. Resumes
    go to external storage and only their link is saved on the order.
*   **No LinkedIn verification.** LinkedIn tasks are honour-system link clicks,
    worth little and allowed once. No scraping or automation.
*   **No passwords or social sign-in.** Email magic link only.
*   **No public reviews, promotions, admin dashboard or CI pipeline in v1.**
    These are listed as later work in the PRD. Reviews are collected on
    delivered orders in v1 but not shown publicly.
*   **No uptime promise.** The site is labelled a personal portfolio project.
*   **No multi-language or multi-currency support.** English only; points only.

## Open Questions

These questions still need an answer and are carried forward from the PRD or
raised while drafting. They are removed as they are answered.

*   **Employment contract:** Does the Capgemini contract allow free SFCC help on
    the side? Blocks launch, not the build.
*   **Agent API context variables on Developer Edition:** The design binds the
    concierge to the visitor's wallet through a context variable set by the
    Next.js server (see Technical Plan, section 7). This must be confirmed in a
    real org in milestone 5. The fallback is described there.
*   **Connected App vs External Client App:** New orgs may steer integrations
    to External Client Apps. Either works with the client credentials flow; the
    choice is made when the org exists and does not change the design.
*   **Launch set:** All four services are built. Which ones are switched on at
    launch is a data change (`Active__c`), not a design change.
*   **Final point values** for services and tasks. The PRD's numbers are used as
    placeholders.
*   **Name and domain** for the shop.

## Critical User Journeys (CUJs)

### CUJ 1: Visitor earns points and redeems a service

*   **Given**: A visitor with no wallet opens the shop.
*   **When**: They enter their email, click the magic link, complete tasks
    until their balance covers a service, add it to the cart, and check out.
*   **Then**: A wallet exists for their email with 50 welcome points; each
    completed task adds one ledger entry; checkout adds one negative ledger
    entry per service and creates one order per service; the balance shown
    equals the sum of the ledger; a confirmation email arrives with next steps.

### CUJ 2: Visitor gives fulfilment details and receives the service

*   **Given**: A visitor has a placed order.
*   **When**: They provide the input the service needs (type the question,
    upload a resume PDF, or book a slot), and Piyush later marks the order
    Delivered.
*   **Then**: The order shows the input; on delivery the visitor gets an email
    and is invited to review; submitting a review adds 75 points once.

### CUJ 3: Recruiter takes a two-minute look

*   **Given**: A recruiter opens the shop link from the resume.
*   **When**: They browse the catalogue and open "How it's built".
*   **Then**: They see a working shop, the architecture, the order lifecycle,
    the SFCC mapping and the GitHub link, without signing in.

### CUJ 4: Piyush fulfils an order

*   **Given**: A visitor placed an order.
*   **When**: Piyush gets the new-order notification, opens the order list in
    the Salesforce app, delivers the service and sets the status to Delivered.
*   **Then**: The order records when it was delivered and the delivered email
    goes to the visitor.

### CUJ 5: Visitor asks the concierge

*   **Given**: A signed-in visitor opens the chat panel.
*   **When**: They ask "how many points do I have?", "how can I earn more?",
    "which service should I pick?", or "order the resume review".
*   **Then**: The agent answers from their own wallet and the live catalogue,
    and an order started from chat goes through the same checkout rules as the
    cart. When the hourly Agentforce limit is reached, the chat says it is busy.

### CUJ 6: Abuse attempts fail

*   **Given**: A visitor tries to gain points unfairly.
*   **When**: They replay a task completion, double-submit checkout, claim a
    once-only task twice, refer themselves with a second address they control,
    or call the Next.js API for someone else's wallet.
*   **Then**: Replays and double submits count once; limits hold; the API only
    acts on the wallet tied to the signed-in session. Self-referral with a
    second real email address cannot be fully prevented; its reward is capped
    by the task limit.

## Technical Plan (Architecture)

### Decisions made while drafting

| Decision | Choice | Decided by |
| --- | --- | --- |
| Front end platform | Headless Next.js on Vercel | Author (the approved Problem section depends on a headless front end) |
| Email delivery | Record-triggered Flows decide when to email; they hand off to the Next.js server, which sends through an email provider (Resend). Magic links are sent by Next.js directly. | Author |
| Agentforce access | Agent API called from the Next.js server, with the wallet passed as a server-set context variable | Claude, at the author's request: it keeps the wallet binding on the server, keeps the shop's own UI, and matches the PRD's "chat panel calling the agent through the server" |
| Fulfilment input timing | After the order is placed, on the order page | Claude, at the author's request: matches the PRD journey; checkout stays one step for all four services |
| Cancellation | Visitor may cancel while the order is Awaiting Details; Piyush may cancel any order not yet Delivered; cancelling refunds the points once | Claude, at the author's request: without a refund path, points spent on an order Piyush cannot deliver are lost |
| Balance storage | Roll-up summary of ledger entries on the wallet, with a validation rule that rejects a negative balance | Claude, at the author's request: the database enforces "never negative", not just Apex |
| Local development without an org | The storefront talks to a backend interface with two implementations: Salesforce (real) and an in-memory mock with the same rules | Claude, at the author's request: no org exists yet; the mock also lets anyone clone and run the storefront |

### 1. System overview

```text
                       Browser
                          │  HTTPS (shop pages, JSON to /api/*)
                          ▼
        ┌──────────────────────────────────────────┐
        │ Next.js on Vercel  (storefront/)         │
        │  • pages: catalogue, earn, cart, orders, │
        │    how-it's-built, sign-in               │
        │  • /api/* route handlers (session check) │
        │  • ShopBackend: SalesforceBackend | Mock │
        │  • email sender (Resend)                 │
        └───┬──────────────┬──────────────┬────────┘
            │ OAuth client │ Agent API    │ signed webhooks in
            │ credentials  │ (sessions,   │ (Salesforce email
            │ + Apex REST  │  messages)   │  events, Cal.com)
            ▼              ▼              │
        ┌──────────────────────────────┐  │
        │ Salesforce Developer Edition │  │
        │ (salesforce/)                │  │
        │  • custom objects + rules    │──┘ Named Credential callout
        │  • Apex services + REST      │    (EmailEventDispatcher)
        │  • record-triggered Flows    │
        │  • Agentforce concierge      │
        └──────────────────────────────┘
   Other services: Resend (email), Vercel Blob (resume PDFs), Cal.com (booking)
```

Rules that hold across the whole system:

*   The browser only talks to Next.js. Salesforce credentials, the Agent API
    token, the Resend key and webhook secrets exist only as Vercel server
    environment variables.
*   Next.js decides who the visitor is (from its session cookie) and passes
    that wallet's ID to Salesforce. Salesforce trusts the wallet ID because only
    the integration user can call the API. No Next.js route accepts a wallet ID
    from the browser.
*   Every points change goes through `LedgerService` in Apex. Nothing else
    inserts ledger entries.

### 2. Data model (Salesforce custom objects)

```text
Service__c ──< Shop_Order__c >── Wallet__c ──< Points_Ledger__c (master-detail)
                                     │
Earn_Task__c ──< Task_Completion__c >┘
```

| Object | Key fields | Notes |
| --- | --- | --- |
| `Service__c` | `Slug__c` (unique, external ID), `Description__c`, `Points_Price__c`, `Fulfilment_Type__c` (Question, Resume, Booking), `Booking_Url__c`, `Delivery_Promise__c`, `Active__c`, `Sort_Order__c` | The catalogue and its price book in one object. |
| `Wallet__c` | `Email__c` (unique, external ID, stored lower-case), `Confirmed__c`, `Confirmed_At__c`, `Balance__c` (roll-up SUM of ledger `Amount__c`), `Referral_Code__c` (unique), `Referred_By__c` (lookup to Wallet), `Link_Token_Hash__c`, `Link_Token_Expires__c`, `Link_Requests_Window_Start__c`, `Link_Requests_Count__c` | One per email. Validation rule: `Balance__c >= 0`. |
| `Points_Ledger__c` | `Wallet__c` (master-detail), `Amount__c` (signed integer), `Entry_Type__c` (Earn, Redeem, Refund, Adjustment), `Reason__c`, `Idempotency_Key__c` (unique, external ID), `Task_Completion__c`, `Shop_Order__c` | Append-only: the trigger rejects every update and delete. |
| `Earn_Task__c` | `Key__c` (unique, external ID), `Description__c`, `Points__c`, `Verification__c` (System, Site, Form, Honour, Referral, Review), `Max_Per_Wallet__c`, `Link_Url__c`, `Active__c`, `Sort_Order__c` | Earning rules. The welcome bonus is the `signup` task with `Verification__c = System`. |
| `Task_Completion__c` | `Wallet__c`, `Earn_Task__c`, `Completion_Key__c` (unique, external ID), `Evidence__c` (long text, 2,000 characters), `Points_Awarded__c` | One row per counted completion. |
| `Shop_Order__c` | auto-number name `PS-{0000}`, `Wallet__c`, `Service__c`, `Points_Spent__c`, `Status__c` (Awaiting Details, In Progress, Delivered, Cancelled), `Checkout_Key__c`, `Question__c`, `Resume_Url__c`, `Booking_Uid__c`, `Booking_Start__c`, `Delivered_At__c`, `Cancelled_At__c`, `Cancelled_By__c` (Visitor, Piyush), `Review_Rating__c` (1–5), `Review_Text__c` | One order per service bought. |

Storage estimate: a wallet with 10 ledger entries, 5 completions and 2 orders
is about 17 records × 2 KB = 34 KB. The 5 MB limit allows about 150 such
visitors. That is above the 50 sign-up target, but not by much; section 10
covers what happens as it fills.

Record access: org-wide defaults are Private for every custom object. The
integration user gets a permission set (`Shop_Integration`) with the object and
field access the API needs. Piyush's admin user sees everything. Visitors have
no Salesforce user.

### 3. Points rules (Apex service layer)

All three services are `with sharing` classes called by the REST layer, the
Agentforce actions and the trigger handlers.

**`LedgerService`** is the only writer of `Points_Ledger__c`.

*   `post(walletId, amount, type, reason, idempotencyKey, relatedIds)` inserts
    one entry. If an entry with that idempotency key exists, it returns the
    existing entry and posts nothing.
*   Debits lock the wallet first (`SELECT ... FOR UPDATE`), so two checkouts
    for one wallet run one after the other. If the roll-up would go below zero,
    the wallet validation rule fails the insert; the service turns that into
    an `InsufficientPointsException`.
*   A duplicate idempotency key inserted at the same moment fails on the unique
    index. The service catches `DUPLICATE_VALUE` and returns the existing entry.

**`EarnService.complete(walletId, taskKey, completionRef, evidence)`**

1.  Lock the wallet. Reject if the wallet is not confirmed or the task is
    inactive.
2.  Build the completion key: `walletId:taskKey` for once-only tasks,
    `walletId:taskKey:completionRef` for repeatable ones (the order ID for a
    review, the friend's wallet ID for a referral).
3.  If a completion with that key exists, return it (a replay).
4.  If the wallet already has `Max_Per_Wallet__c` completions of this task,
    reject with `TaskLimitReached`.
5.  Insert the completion and post `+Points__c` with idempotency key
    `earn:<completion key>`.

Task-specific checks before step 1: a `review` completion needs a Delivered
order of this wallet with no review yet; a `referral` completion is only
created by the sign-in flow (below), never by a direct API call.

**`CheckoutService.checkout(walletId, serviceSlugs[], checkoutKey)`**

1.  If orders with this `Checkout_Key__c` exist for the wallet, return them.
2.  Lock the wallet; load the active services; reject unknown or inactive
    slugs.
3.  Reject if the balance is below the total price.
4.  Insert one `Shop_Order__c` per service (status Awaiting Details).
5.  Post one Redeem entry per order with idempotency key
    `redeem:<orderId>`.
6.  Any failure rolls back the whole transaction, so there are never orders
    without debits or debits without orders.

**Cancellation and refunds.** Setting `Status__c` to Cancelled (by the API
for a visitor, or by Piyush in the Salesforce app) makes the order trigger
handler post `+Points_Spent__c` with idempotency key `refund:<orderId>`. A
validation rule blocks moving a Delivered or Cancelled order to any other
status, and blocks a visitor cancel (marked by the API) unless the order is
Awaiting Details.

**Triggers.** One trigger per object (`Wallet__c`, `Points_Ledger__c`,
`Shop_Order__c`, `Task_Completion__c`) delegates to a handler class that
extends a small in-repo `TriggerHandler` base. Handlers are bulk-safe: each
does a fixed number of queries and DML statements, whatever the batch size.

### 4. API (Apex REST, `/services/apexrest/shop/v1/...`)

All endpoints accept and return JSON, and are called only by the Next.js
server as the integration user. Errors return `{ "error": { "code", "message" } }`
with codes such as `INSUFFICIENT_POINTS`, `TASK_LIMIT_REACHED`,
`NOT_FOUND`, `INVALID_STATE`, `RATE_LIMITED`.

| Method and path | Purpose |
| --- | --- |
| `GET /catalog` | Active services and active earn tasks. |
| `POST /auth/link` `{ email, tokenHash, expiresAt, referralCode? }` | Create or find the wallet for this email, store the token hash and expiry, enforce at most 3 link requests per email per hour. |
| `POST /auth/verify` `{ email, tokenHash }` | If the hash matches and has not expired: clear it, confirm the wallet, award the `signup` task once, award the referrer's `referral` task once if this is a new confirmation. Returns the wallet. |
| `GET /wallets/{id}` | Balance, the 20 most recent ledger entries, task completion counts. |
| `POST /wallets/{id}/tasks/{key}` `{ completionRef?, evidence? }` | Complete a task (`EarnService`). |
| `POST /wallets/{id}/checkout` `{ checkoutKey, services: [slug] }` | Place orders (`CheckoutService`). |
| `GET /wallets/{id}/orders` | The wallet's orders, newest first. |
| `GET /wallets/{id}/orders/{orderId}` | One order, only if it belongs to the wallet. |
| `POST /wallets/{id}/orders/{orderId}/details` `{ question? , resumeUrl?, bookingUid?, bookingStart? }` | Save the fulfilment input that matches the service type; move Awaiting Details to In Progress. |
| `POST /wallets/{id}/orders/{orderId}/cancel` | Visitor cancel (Awaiting Details only). |
| `POST /wallets/{id}/orders/{orderId}/review` `{ rating, text }` | Save a review on a Delivered order and complete the `review` task. |

Next.js `/api/*` routes mirror these but take the wallet from the session
cookie, never from the request.

### 5. Sign-in (magic link, run by Next.js)

1.  Visitor submits an email (and a referral code if they arrived by a
    referral link).
2.  Next.js creates 32 random bytes as the token, sends `SHA-256(token)` and an
    expiry 15 minutes ahead to `POST /auth/link`, then emails the link
    `/auth/verify?email=…&token=…` through Resend. Salesforce never sees the
    raw token.
3.  The verify page posts the hash to `POST /auth/verify`. On success Next.js
    sets an `httpOnly`, `Secure`, `SameSite=Lax` cookie holding a JWT (signed
    with `SESSION_SECRET`, 30 days) with the wallet ID and email.
4.  Sign-out deletes the cookie.

The token is single use because verify clears the stored hash.

### 6. Email (Flows decide, Next.js sends)

```text
Shop_Order__c / Wallet__c change
   → record-triggered Flow (async path) picks the event
   → Apex invocable EmailEventDispatcher.dispatch(eventType, recordId)
   → Queueable callout, Named Credential "Storefront_Webhook"
   → POST https://<shop>/api/webhooks/salesforce-email
        headers: X-Shop-Timestamp, X-Shop-Signature = HMAC-SHA256(secret, timestamp + body)
   → Next.js checks the signature and that the timestamp is within 5 minutes,
     renders the template, sends with Resend
```

| Flow | Fires when | Email |
| --- | --- | --- |
| `Wallet_Welcome` | `Confirmed__c` becomes true | Welcome, balance, link to ways to earn |
| `Order_Confirmed` | `Shop_Order__c` created | To visitor: what to do next for this service type. To Piyush: new-order alert. |
| `Order_Delivered` | `Status__c` becomes Delivered | To visitor: delivered, invite to review |
| `Order_Cancelled` | `Status__c` becomes Cancelled | To visitor: cancelled, points returned |

The webhook body carries only an event type and IDs plus the fields the
template needs (first part of the email address, service name, points, order
number). Each event has an ID (`<eventType>:<recordId>`); Next.js does not
resend an event it has already sent in the last 24 hours (kept in memory per
server instance, so a rare duplicate is possible and accepted). A failed
callout is retried by the Queueable up to 3 times; after that the dispatcher
sends Piyush a Salesforce custom notification (bell icon and mobile app), which
does not count against email limits. Magic-link and "send Piyush an email" messages are sent by Next.js
directly and do not pass through Salesforce.

### 7. Agentforce concierge

*   **Agent:** one Agentforce Service Agent, "Shop Concierge", with one topic
    ("Points Shop help") whose instructions keep it on shop questions, forbid
    promising delivery dates beyond each service's `Delivery_Promise__c`, and
    tell it to ask before placing an order.
*   **Actions (Apex `@InvocableMethod` classes):**
    `ConciergeGetBalance(walletId)`, `ConciergeListEarnTasks(walletId)`
    (with what this wallet can still earn), `ConciergeRecommendService(walletId,
    goal)` (rule-based: matches the goal text against service tags and the
    balance), `ConciergeStartOrder(walletId, serviceSlug, checkoutKey)`
    (calls `CheckoutService`).
*   **Wallet binding:** when Next.js starts an Agent API session, it sets a
    custom context variable `WalletId` from the session cookie. In Agent
    Builder, every action's `walletId` input is mapped to that variable, so the
    model cannot supply or change it.
*   **Fallback if the Developer Edition cannot map context variables to
    action inputs:** the agent ships with only the two actions that need no
    wallet (list earn tasks in general, recommend by goal), and balance or
    ordering questions get a link to the right page.
*   **Chat panel:** `POST /api/concierge` starts or reuses a session (session
    ID kept in a second `httpOnly` cookie) and forwards the message
    synchronously. A 429 or limit error shows "The concierge is busy right
    now. Try again in a few minutes." Signed-out visitors see a prompt to sign
    in instead of the chat.
*   **Agent metadata:** built in Agent Builder, then retrieved into
    `salesforce/` with the Salesforce CLI so it is in version control. Setup
    steps are in `docs/agentforce-setup.md`.

### 8. Storefront

*   **Stack:** Next.js (App Router), TypeScript, Tailwind CSS, `jose` for the
    session JWT, `zod` for request validation, Resend SDK, `@vercel/blob`.
*   **Pages:** `/` (catalogue + ways to earn), `/services/[slug]`, `/cart`,
    `/orders`, `/orders/[id]` (status, fulfilment input, cancel, review),
    `/signin`, `/auth/verify`, `/how-its-built`, `/feedback`, `/contact`.
*   **Balance updates:** the header shows the balance from the server on each
    page load and refreshes after every action that changes it (task complete,
    checkout, cancel, review). There is no push channel; "live" means updated
    after the visitor's own actions.
*   **Cart:** kept in a cookie as a list of service slugs (one of each
    service). Checkout creates a `checkoutKey` (UUID) when the cart page loads
    and reuses it until checkout succeeds, so a double click or retry places
    the order once.
*   **`ShopBackend` interface:** one TypeScript interface for every call in
    section 4. `SalesforceBackend` calls Apex REST with a cached OAuth token
    (refreshed on 401). `MockBackend` keeps the same rules in memory with seed
    data, for local development and demos. `SHOP_BACKEND=mock|salesforce`
    picks one; production refuses to start with `mock`.
*   **Earn tasks in the UI:**
    *   `explore` — the site records visited paths in a cookie; when three
        distinct paths including `/how-its-built` are visited, the client calls
        the task endpoint and the server re-checks the cookie.
    *   `feedback` and `email-piyush` — forms; the server sends the message to
        Piyush through Resend, then completes the task with the text as
        evidence (trimmed to 2,000 characters).
    *   `linkedin-post`, `linkedin-hi` — the link opens LinkedIn in a new tab
        and the click completes the task (honour system, once).
    *   `referral` — each wallet page shows `/?ref=<Referral_Code__c>`.
*   **Fulfilment inputs on `/orders/[id]`:**
    *   Question: a text area (20–2,000 characters).
    *   Resume: PDF only, at most 5 MB, uploaded from the browser straight to
        Vercel Blob through a client-upload token that Next.js issues only for
        the visitor's own order in Awaiting Details. The blob gets a random
        path; its URL is saved on the order.
    *   Booking: a Cal.com link for the service with the order ID and email
        prefilled as booking metadata. Cal.com's `BOOKING_CREATED` webhook to
        `/api/webhooks/calcom` (signature checked) saves the booking UID and
        start time on the order.
*   **Failure display:** every Salesforce call has a 10-second timeout. A
    timeout, 5xx or `REQUEST_LIMIT_EXCEEDED` shows "The shop's back office is
    taking a break" on the affected component; the catalogue falls back to a
    copy cached for 10 minutes so the home page still renders.

### 9. Repository layout

```text
points-shop/
  salesforce/   SFDX project: objects, Apex, triggers, Flows, permission set, agent metadata
  storefront/   Next.js app
  docs/         PRD copy, design, setup guides (org, Agentforce, Vercel)
```

### 10. Limits and how the design stays inside them

| Limit (Developer Edition) | Design response |
| --- | --- |
| 15 Flow / 50 total emails per day | Salesforce sends no email; Flows hand off to Next.js and Resend. Resend's free tier (100 per day) becomes the cap. |
| 150 Agentforce requests per hour | Chat only for signed-in visitors; "busy" message on limit. |
| About 5 MB data storage | Text records only; resumes in Vercel Blob. A scheduled Apex job deletes unconfirmed wallets older than 7 days. The "How it's built" page and Piyush's checklist include watching storage in Setup. |
| 15,000 API calls per 24 hours | About 5 calls per page view at most; the catalogue is cached 10 minutes. Enough for hundreds of visits a day. |
| Org terminated after 45 days without login | Piyush logs in to fulfil orders; a monthly calendar reminder covers quiet months. |

## Alternatives Considered

### Alternative A: Lightning Web Components on an Experience Cloud site

*   **Pros**: Everything stays in one platform; no Vercel, no OAuth integration,
    no separate session handling. Experience Cloud has built-in passwordless
    login for external users.
*   **Cons**: It is not headless, so it does not close the gap the project
    exists for. Each visitor becomes a Salesforce external user, and Developer
    Edition includes very few community licences. Styling and Lighthouse scores
    are harder to control.
*   **Reason for Rejection**: Rejected by author: the approved Problem section
    requires a separate front end calling a commerce API.

### Alternative B: Salesforce sends every email (Flows and Apex)

*   **Pros**: Matches the PRD as written; no email provider, no webhook, no
    shared secret.
*   **Cons**: Developer Edition allows 15 Flow email recipients and 50 recipients
    in total per day. Magic links would stop arriving after about 40 sign-ins in
    a day, and order emails after about 5 orders.
*   **Reason for Rejection**: Rejected by author: sign-in must not depend on a
    15–50 per day cap.

### Alternative C: Split email (magic links from Next.js, order emails from Flows)

*   **Pros**: Order emails still come from Salesforce directly; sign-in is safe.
*   **Cons**: Order emails stop silently above about 5 orders a day, and the
    project has two email paths to maintain.
*   **Reason for Rejection**: Rejected by author in favour of one email path with
    no Salesforce limit.

### Alternative D: Salesforce embedded messaging widget for the concierge

*   **Pros**: Less code; Salesforce hosts the chat UI.
*   **Cons**: Runs in the browser, so tying the chat to a wallet needs
    Salesforce user verification with a signed JWT. Unclear whether Developer
    Edition includes Messaging for In-App and Web. Its look does not match the
    shop.
*   **Reason for Rejection**: Decided by Claude at the author's request: the
    Agent API from the server keeps the wallet binding out of the browser and
    keeps the shop's own UI.

### Alternative E: Store the balance as a number field updated by Apex

*   **Pros**: No master-detail relationship needed; balance reads are a plain
    field.
*   **Cons**: The balance and the ledger can drift if any code path forgets to
    update both; "never negative" is enforced only by Apex.
*   **Reason for Rejection**: Decided by Claude at the author's request: a
    roll-up summary is always the ledger's sum, and the validation rule on it
    blocks negative balances even if Apex has a bug.

### Alternative F: The browser calls Salesforce directly

*   **Pros**: No Next.js API layer.
*   **Cons**: Needs a Salesforce user or guest access for every visitor and
    exposes the org's API to the internet. The PRD rules it out.
*   **Reason for Rejection**: Rejected by author (PRD): Salesforce is called only
    from the server.

### Alternative G: Collect fulfilment input at checkout

*   **Pros**: One step for the visitor; no Awaiting Details state.
*   **Cons**: Checkout would need a different form per service, and a cart with
    two services would need two inputs before paying. A booking cannot be
    confirmed before the order exists.
*   **Reason for Rejection**: Decided by Claude at the author's request: keeps
    checkout the same for every service and matches the PRD journey.

### Alternative H: No mock backend; develop only against a real org

*   **Pros**: The points rules exist once, in Apex.
*   **Cons**: No storefront work can start or be demoed until the org, the
    Connected App and the REST API all work. Anyone cloning the repository
    needs their own org to see the site.
*   **Reason for Rejection**: Decided by Claude at the author's request. The cost
    is that the rules exist twice; a shared contract test suite (Detailed
    Implementation Plan) runs the same scenarios against both backends to catch
    drift.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Security**
    *   Secrets (Salesforce client secret, Agent API credentials, Resend key,
        `SESSION_SECRET`, `WEBHOOK_SECRET`, Cal.com webhook secret, Blob token)
        live only in Vercel environment variables and `.env.local`, which is
        git-ignored. `.env.example` lists names only. The Salesforce side of
        `WEBHOOK_SECRET` is a protected custom setting set after deployment,
        never committed.
    *   Magic-link tokens: 32 random bytes; only the SHA-256 hash is stored;
        15-minute expiry; single use. The verify link opens a page with a
        "Sign in" button that posts the token, because email link scanners
        follow plain GET links and would use up a single-use token.
    *   Rate limits: 3 link requests per email per hour (enforced in
        Salesforce). Form endpoints (feedback, email Piyush) reject bodies over
        2,000 characters and earn points once per wallet through the task
        limit; the message itself can be sent at most 5 times per wallet per
        day.
    *   All `/api/*` routes that change state check the `Origin` header against
        the site URL, in addition to `SameSite=Lax` cookies.
*   **Privacy**
    *   Personal data held: email addresses, question text, feedback, resume
        PDFs (Vercel Blob, random unguessable URLs), booking times.
    *   A short privacy note in the footer says what is stored and that a
        visitor can email Piyush to have their wallet and files deleted.
        Deletion is manual in v1.
*   **Performance**
    *   Catalogue and "How it's built" are server-rendered; the catalogue is
        cached 10 minutes. Target: mobile Lighthouse Performance 90 or more,
        Accessibility 100 on `/`, `/services/[slug]`, `/how-its-built`.
*   **Rollout and rollback**
    *   Salesforce changes deploy with `sf project deploy start`; rollback is
        redeploying the previous commit. Data is never deleted by a deployment.
    *   Vercel keeps previous deployments; rollback is "promote previous
        deployment".
    *   Services are switched on or off with `Service__c.Active__c`.

--------------------------------------------------------------------------------

### Additional Resources

*   [PRD: Points Shop on Salesforce](./docs/prd.md)
*   [Email Functionality Restrictions for Trial Orgs and Developer Edition Orgs](https://help.salesforce.com/s/articleView?id=004633792&language=en_US&type=1)
    (50 recipients per day; 15 workflow email recipients per day)
*   [Developer Edition with Agentforce and Data Cloud](https://help.salesforce.com/s/articleView?language=en_US&id=xcloud.overview_developer_edition_agentforce_datacloud.htm&type=5)
*   [Agent API: Get Started](https://developer.salesforce.com/docs/ai/agentforce/guide/agent-api-get-started.html)

### Future Improvements

*   **Delete resumes automatically** 30 days after the order is Delivered.
*   **Self-service data deletion** from the order page.
*   **CI** running Apex tests in a scratch org and the storefront tests on every
    pull request (listed as later work in the PRD).

--------------------------------------------------------------------------------

## Detailed Implementation Plan

The plan follows the PRD's six milestones. Every file below is new; the
repository is empty today apart from `docs/prd.md`. Paths are relative to the
repository root.

### Target Files to Create/Modify

#### Repository root and docs

1.  **`README.md`** (Create) — What the project is, the architecture diagram,
    how to run the storefront with the mock backend (`npm install`,
    `npm run dev`), and links to the setup guides.
2.  **`.gitignore`** (Create) — Ignores `node_modules`, `.next`, `.env*.local`,
    `.sf`, `.sfdx`, coverage and Playwright reports.
3.  **`docs/prd.md`** (Exists) — Local copy of the PRD; unchanged.
4.  **`docs/designs/points_shop_v1.md`** (Create) — The approved version of
    this design.
5.  **`docs/setup-org.md`** (Create) — Sign up for Developer Edition with
    Agentforce, install the Salesforce CLI, authorise the org, deploy, assign
    permission sets, import seed data, create the integration user and the
    Connected App (or External Client App) with client credentials, set the
    protected custom setting, set the Named Credential URL, schedule the
    cleanup job.
6.  **`docs/setup-agentforce.md`** (Create) — Build "Shop Concierge" in Agent
    Builder: topic, instructions, the four actions, the `WalletId` context
    variable mapping, the fallback if mapping is unsupported, and retrieving
    the agent metadata into `salesforce/`.
7.  **`docs/setup-vercel.md`** (Create) — Vercel project, environment
    variables, Resend domain, Vercel Blob store, Cal.com event types and
    webhook.

#### Salesforce project (`salesforce/`)

8.  **`salesforce/sfdx-project.json`** (Create) — SFDX project, package
    directory `force-app`, current API version.
9.  **`salesforce/.forceignore`** (Create) — Excludes local and IDE files from
    deployments.
10. **`salesforce/config/project-scratch-def.json`** (Create) — Scratch org
    definition for later CI work.
11. **`salesforce/package.json`** (Create) — Dev tools only: Prettier with
    `prettier-plugin-apex`; scripts `format`, `format:check`, `deploy`,
    `test` (wrapping `sf` commands).
12. **`salesforce/data/plan.json`, `salesforce/data/Service__c.json`,
    `salesforce/data/Earn_Task__c.json`** (Create) — Seed data for
    `sf data import tree`: the four services and eight tasks (plus the
    `signup` system task) with the PRD's point values.

**Custom objects** (`salesforce/force-app/main/default/objects/`). Each object
folder holds `<Object>.object-meta.xml` (label, plural, name field, sharing
Private), one `fields/<Field>.field-meta.xml` per field listed, and the listed
`validationRules/` and `listViews/` files.

13. **`Service__c/`** — Fields: `Slug__c` (Text 60, unique, external ID),
    `Description__c` (Long Text 2,000), `Points_Price__c` (Number 6,0,
    required), `Fulfilment_Type__c` (Picklist: Question, Resume, Booking),
    `Booking_Url__c` (URL), `Delivery_Promise__c` (Text 100), `Tags__c`
    (Text 255, comma-separated words used by the recommend action),
    `Active__c` (Checkbox), `Sort_Order__c` (Number 3,0). Validation:
    `Booking_Url_Required_For_Booking`, `Price_Positive`.
14. **`Wallet__c/`** — Name: auto-number `W-{00000}`. Fields: `Email__c`
    (Email, unique, external ID), `Confirmed__c`, `Confirmed_At__c`
    (Date/Time), `Balance__c` (Roll-Up Summary SUM of
    `Points_Ledger__c.Amount__c`), `Referral_Code__c` (Text 12, unique),
    `Referred_By__c` (Lookup Wallet), `Link_Token_Hash__c` (Text 64),
    `Link_Token_Expires__c` (Date/Time), `Link_Requests_Window_Start__c`
    (Date/Time), `Link_Requests_Count__c` (Number 3,0). Validation:
    `Balance_Not_Negative`.
15. **`Points_Ledger__c/`** — Name: auto-number `L-{000000}`. Fields:
    `Wallet__c` (Master-Detail Wallet, not reparentable), `Amount__c`
    (Number 6,0, required), `Entry_Type__c` (Picklist: Earn, Redeem, Refund,
    Adjustment), `Reason__c` (Text 255), `Idempotency_Key__c` (Text 120,
    unique, external ID, required), `Task_Completion__c` (Lookup),
    `Shop_Order__c` (Lookup). Validation: `Amount_Sign_Matches_Type` (Earn
    and Refund positive, Redeem negative, none zero).
16. **`Earn_Task__c/`** — Fields: `Key__c` (Text 40, unique, external ID),
    `Description__c` (Text 255), `Points__c` (Number 4,0),
    `Verification__c` (Picklist: System, Site, Form, Honour, Referral,
    Review), `Max_Per_Wallet__c` (Number 3,0, default 1), `Link_Url__c`
    (URL), `Active__c`, `Sort_Order__c`.
17. **`Task_Completion__c/`** — Name: auto-number `TC-{000000}`. Fields:
    `Wallet__c` (Lookup, required), `Earn_Task__c` (Lookup, required),
    `Completion_Key__c` (Text 160, unique, external ID, required),
    `Evidence__c` (Long Text 2,000), `Points_Awarded__c` (Number 4,0).
18. **`Shop_Order__c/`** — Name: auto-number `PS-{0000}`. Fields as in
    Technical Plan section 2, plus `Customer_Email__c` (formula from
    `Wallet__c.Email__c`, for list views and Flows). Validation:
    `Terminal_Status_Locked` (Delivered and Cancelled cannot change),
    `Visitor_Cancel_Only_When_Awaiting` (`Cancelled_By__c = 'Visitor'`
    requires the prior status to be Awaiting Details),
    `Delivered_Needs_Input` (cannot go to Delivered from Awaiting Details).
    List views: `Open_Orders` (Awaiting Details or In Progress, oldest first),
    `Delivered_Orders`.

**App, tabs, layouts, access, settings**

19. **`tabs/<Object>.tab-meta.xml`** for the six objects (Create) — So Piyush
    can open them in the Salesforce app.
20. **`applications/Points_Shop.app-meta.xml`** (Create) — Lightning app with
    the six tabs, Shop Orders first.
21. **`layouts/Shop_Order__c-Shop Order Layout.layout-meta.xml`** (Create) —
    Visitor input (question, resume link, booking) above status fields so
    fulfilment is one screen.
22. **`permissionsets/Shop_Integration.permissionset-meta.xml`** (Create) —
    Integration user: read on Service and Earn Task; read, create, edit on
    Wallet, Task Completion, Shop Order; read, create on Points Ledger; Apex
    class access to `ShopApi` and the concierge actions.
23. **`permissionsets/Shop_Admin.permissionset-meta.xml`** (Create) — Piyush:
    full access to the six objects, the app and tabs; read-only on Points
    Ledger (corrections are Adjustment entries posted through
    `LedgerService`).
24. **`objects/Shop_Settings__c/`** (Create) — Protected hierarchy custom
    setting: `Webhook_Secret__c`, `Owner_Email__c`, `Storefront_Url__c`.
    Values set after deploy; never committed.
25. **`customNotificationTypes/Shop_Alert.notiftype-meta.xml`** (Create) —
    Bell notification for email-dispatch failures.
26. **`namedCredentials/Storefront_Webhook.namedCredential-meta.xml`**
    (Create) — Callout target for the email webhook; URL set per environment.
    The HMAC signature is computed in Apex from the custom setting, so the
    credential needs no authentication protocol.
27. **`salesforce/scripts/apex/set-shop-settings.apex`** (Create) — Template
    that sets `Shop_Settings__c` values; secrets are pasted at run time.

**Apex** (`salesforce/force-app/main/default/classes/`, each with its
`.cls-meta.xml`)

28. **`TriggerHandler.cls`** — Base class: dispatches before/after
    insert/update/delete to overridable methods; supports bypass by handler
    name for tests and data fixes.
29. **`WalletTriggerHandler.cls`** — Before insert/update: lower-case email,
    generate `Referral_Code__c` (8 characters, unambiguous alphabet) if blank.
30. **`PointsLedgerTriggerHandler.cls`** — Before update and before delete:
    add an error ("ledger entries are append-only"). Before insert: reject
    rows unless `LedgerService` has set its static "posting" flag.
31. **`ShopOrderTriggerHandler.cls`** — Before update: set `Delivered_At__c`
    and `Cancelled_At__c`; default `Cancelled_By__c` to Piyush when blank.
    After update: on change to Cancelled, post the refund through
    `LedgerService`.
32. **`TaskCompletionTriggerHandler.cls`** — Before update and delete: block
    changes (completions are history).
33. **`ShopException.cls`** — One exception class with a `code` property
    (`INSUFFICIENT_POINTS`, `TASK_LIMIT_REACHED`, `NOT_FOUND`,
    `INVALID_STATE`, `RATE_LIMITED`, `VALIDATION`, `UNAUTHORIZED`) used by
    services and mapped to HTTP status by `ShopApi`.
34. **`LedgerService.cls`** — `post(...)` and `postAll(...)` as in Technical
    Plan section 3; wallet locking; duplicate-key handling.
35. **`EarnService.cls`** — `complete(...)` and the per-task checks.
36. **`CheckoutService.cls`** — `checkout(...)`.
37. **`WalletService.cls`** — `requestLink(email, tokenHash, expiresAt,
    referralCode)`, `verify(email, tokenHash)` (confirm, signup bonus,
    referral award), `getSummary(walletId)`.
38. **`OrderService.cls`** — `listOrders`, `getOrder`, `saveDetails`,
    `cancelByVisitor`, `submitReview`; each checks the order belongs to the
    wallet.
39. **`CatalogService.cls`** — Active services and tasks, sorted.
40. **`ShopDtos.cls`** — Request and response classes serialised to JSON;
    keeps Salesforce field names out of the API.
41. **`ShopApi.cls`** — `@RestResource(urlMapping='/shop/v1/*')` with
    `@HttpGet` and `@HttpPost` methods that parse the path, route to the
    services, and map `ShopException` codes to HTTP status (400, 401, 404,
    409, 429).
42. **`EmailEventDispatcher.cls`** — `@InvocableMethod` called by the four
    Flows; builds the event payload and enqueues `EmailEventQueueable`.
43. **`EmailEventQueueable.cls`** — `Database.AllowsCallouts`; signs and
    POSTs the payload to `callout:Storefront_Webhook`; re-enqueues itself up
    to 3 attempts; on final failure sends the `Shop_Alert` notification.
44. **`ConciergeGetBalance.cls`, `ConciergeListEarnTasks.cls`,
    `ConciergeRecommendService.cls`, `ConciergeStartOrder.cls`** —
    `@InvocableMethod` actions with labelled `@InvocableVariable` inputs and
    outputs for Agent Builder; each delegates to the services above.
45. **`UnconfirmedWalletCleanup.cls`** — `Schedulable` and
    `Database.Batchable`: deletes wallets with `Confirmed__c = false` created
    more than 7 days ago.

**Apex tests** (same folder)

46. **`TestDataFactory.cls`** — Builds services, tasks, confirmed wallets
    with a starting balance, and orders in each status.
47. **`ShopCalloutMock.cls`** — `HttpCalloutMock` returning success or
    failure on demand.
48. **`LedgerServiceTest.cls`** — Posts and sums; duplicate key returns the
    first entry; debit beyond balance fails; direct insert outside the
    service fails; update and delete fail.
49. **`EarnServiceTest.cls`** — Once-only task twice; repeatable task up to
    its limit and one more; inactive task; unconfirmed wallet; review without
    a delivered order; bulk completion stays within governor limits.
50. **`CheckoutServiceTest.cls`** — Exact balance; one point short; two
    services in one checkout; same checkout key twice; inactive service;
    failure part-way rolls back everything.
51. **`WalletServiceTest.cls`** — New email; existing email; fourth link
    request in an hour; wrong hash; expired hash; reused hash; signup bonus
    once; referral awarded once; own referral code rejected.
52. **`OrderServiceTest.cls`** — Details per service type; details on
    another wallet's order; visitor cancel in each status; Piyush cancel
    refunds once; review once; terminal status locked.
53. **`ShopApiTest.cls`** — Each route through `RestContext`, including
    error code to HTTP status mapping and unknown routes.
54. **`EmailEventDispatcherTest.cls`** — Payload contents, signature header,
    retry count, notification on final failure.
55. **`ConciergeActionsTest.cls`** — Each action's output, and that
    `ConciergeStartOrder` follows checkout rules.
56. **`TriggerHandlerTest.cls`, `UnconfirmedWalletCleanupTest.cls`** —
    Bypass behaviour; cleanup deletes only old unconfirmed wallets.

**Triggers** (`salesforce/force-app/main/default/triggers/`, each with its
`.trigger-meta.xml`)

57. **`WalletTrigger`, `PointsLedgerTrigger`, `ShopOrderTrigger`,
    `TaskCompletionTrigger`** — One line each: `new <Handler>().run();`.

**Flows** (`salesforce/force-app/main/default/flows/`)

58. **`Wallet_Welcome.flow-meta.xml`** — Record-triggered after save on
    `Wallet__c` when `Confirmed__c` changes to true; asynchronous path calls
    `EmailEventDispatcher` with `wallet.welcome`.
59. **`Order_Confirmed.flow-meta.xml`** — After insert on `Shop_Order__c`;
    asynchronous path dispatches `order.confirmed`.
60. **`Order_Delivered.flow-meta.xml`** — After update when status changes to
    Delivered; dispatches `order.delivered`.
61. **`Order_Cancelled.flow-meta.xml`** — After update when status changes to
    Cancelled; dispatches `order.cancelled`.

**Agent metadata** — Not written by hand. Built in Agent Builder in milestone
5 and retrieved with the CLI into the folders it creates (`bots/`,
`genAiPlannerBundles/`, `genAiPlugins/`, `genAiFunctions/`). Listed in
`docs/setup-agentforce.md`.

#### Storefront (`storefront/`)

**Project files**

62. **`storefront/package.json`** (Create) — Next.js, React, TypeScript,
    Tailwind CSS, `jose`, `zod`, `resend`, `@vercel/blob`; dev: Vitest,
    Playwright, ESLint. Scripts: `dev`, `build`, `start`, `lint`,
    `typecheck`, `test`, `test:contract:salesforce`, `test:e2e`.
63. **`storefront/tsconfig.json`, `next.config.ts`, `postcss.config.mjs`,
    `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`**
    (Create) — Standard configuration; Playwright starts the dev server with
    `SHOP_BACKEND=mock`.
64. **`storefront/.env.example`** (Create) — Every variable name with a
    comment, no values: `SHOP_BACKEND`, `SITE_URL`, `SESSION_SECRET`,
    `SF_LOGIN_URL`, `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_AGENT_ID`,
    `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`, `WEBHOOK_SECRET`,
    `CALCOM_WEBHOOK_SECRET`, `BLOB_READ_WRITE_TOKEN`, `BMAC_URL`,
    `GITHUB_URL`, `LINKEDIN_URL`.

**Library code** (`storefront/src/lib/`)

65. **`env.ts`** — Parses environment variables with `zod`; in production
    refuses `SHOP_BACKEND=mock` and missing secrets.
66. **`backend/types.ts`** — `ShopBackend` interface and DTO types matching
    Technical Plan section 4; error type with the shared codes.
67. **`backend/salesforce.ts`** — OAuth client credentials token cache
    (refresh on 401), `fetch` with 10-second timeout, JSON mapping, error
    mapping (`REQUEST_LIMIT_EXCEEDED` and 5xx become `UNAVAILABLE`).
68. **`backend/mock.ts`, `backend/mock-seed.ts`** — In-memory implementation
    of the same rules (ledger, limits, idempotency, statuses, refunds), seeded
    with the PRD's services and tasks; state kept on `globalThis` so it
    survives hot reloads.
69. **`backend/index.ts`** — Returns the backend chosen by `SHOP_BACKEND`.
70. **`session.ts`** — Create, read and clear the session JWT cookie.
71. **`magic-link.ts`** — Token generation, hashing, link building.
72. **`cart.ts`** — Read and write the cart cookie; one of each service.
73. **`explore.ts`** — Track visited paths in a cookie; decide when the
    `explore` task is earned.
74. **`email/send.ts`, `email/templates.ts`** — Resend client (logs to the
    console when `RESEND_API_KEY` is unset, for local runs) and HTML plus
    text templates for magic link, welcome, order confirmed (one variant per
    fulfilment type), delivered, cancelled, new-order alert, and visitor
    message to Piyush.
75. **`webhook-signature.ts`** — HMAC-SHA256 sign and verify with a
    5-minute timestamp window and constant-time comparison.
76. **`concierge/agent-api.ts`, `concierge/mock-agent.ts`** — Agent API
    session start (with the `WalletId` variable), send message, end session;
    the mock answers balance, earn and recommend questions from the mock
    backend so the panel works locally.
77. **`origin-check.ts`** — Rejects state-changing requests whose `Origin`
    does not match `SITE_URL`.

**Routes** (`storefront/src/app/`)

78. **`layout.tsx`, `globals.css`, `not-found.tsx`, `error.tsx`** — Shell
    with header (name, balance, cart count, sign in/out), footer (portfolio
    notice, privacy note, Buy Me a Coffee, GitHub), Tailwind theme.
79. **`page.tsx`** — Catalogue grid and ways-to-earn panel.
80. **`services/[slug]/page.tsx`** — Service detail, delivery promise, add to
    cart.
81. **`cart/page.tsx`** — Cart lines, total, balance, checkout button
    (disabled when short, showing how many points are missing).
82. **`orders/page.tsx`, `orders/[id]/page.tsx`** — Order list; order detail
    with status, fulfilment input form, cancel button, review form.
83. **`signin/page.tsx`, `auth/verify/page.tsx`** — Email form; verify page
    with a "Sign in" button that posts the token.
84. **`how-its-built/page.tsx`** — Architecture diagram (inline SVG), order
    lifecycle, SFCC mapping table, links to GitHub and this design.
85. **`feedback/page.tsx`, `contact/page.tsx`** — Forms for the feedback and
    email-Piyush tasks.
86. **`api/auth/link/route.ts`, `api/auth/verify/route.ts`,
    `api/auth/signout/route.ts`** — Sign-in flow.
87. **`api/cart/route.ts`** — Add and remove cart lines.
88. **`api/checkout/route.ts`** — Checkout with the cart's checkout key;
    clears the cart on success.
89. **`api/tasks/[key]/route.ts`** — Task completion with per-task
    server-side checks (explore cookie, form body, LinkedIn link).
90. **`api/orders/[id]/details/route.ts`, `api/orders/[id]/cancel/route.ts`,
    `api/orders/[id]/review/route.ts`** — Order actions.
91. **`api/resume-upload/route.ts`** — Issues a Vercel Blob client-upload
    token (PDF, 5 MB) for the visitor's own order in Awaiting Details.
92. **`api/concierge/route.ts`** — Chat proxy with session cookie and busy
    handling.
93. **`api/webhooks/salesforce-email/route.ts`** — Verifies the signature,
    sends the email for the event, ignores repeated event IDs for 24 hours.
94. **`api/webhooks/calcom/route.ts`** — Verifies the Cal.com signature,
    saves booking details on the order.

**Components** (`storefront/src/components/`)

95. **`Header.tsx`, `Footer.tsx`, `ServiceCard.tsx`, `EarnPanel.tsx`,
    `AddToCartButton.tsx`, `CheckoutButton.tsx`, `OrderStatus.tsx`,
    `FulfilmentForm.tsx`, `ReviewForm.tsx`, `ConciergePanel.tsx`,
    `ErrorNotice.tsx`, `SignInForm.tsx`, `ExploreTracker.tsx`** — UI pieces
    used by the routes above; client components only where interaction needs
    them.

**Tests** (`storefront/tests/`)

96. **`contract/scenarios.ts`** — Backend-agnostic scenarios covering CUJ 1,
    2 and 6: sign in, welcome bonus once, task limits, replay, checkout exact
    and short, double checkout, cancel and refund once, review once, another
    wallet's order not found.
97. **`contract/mock.test.ts`** — Runs the scenarios against the mock on
    every `npm test`.
98. **`contract/salesforce.test.ts`** — Runs the same scenarios against a real
    org; skipped unless `SF_CLIENT_ID` is set; creates its own wallets with
    `+contract-<uuid>` email addresses.
99. **`unit/session.test.ts`, `unit/webhook-signature.test.ts`,
    `unit/cart.test.ts`, `unit/explore.test.ts`, `unit/magic-link.test.ts`**
    — Unit tests for the library code.
100. **`e2e/visitor-journey.spec.ts`** — Playwright against the mock: sign in
     (magic link read from the local email log), earn, checkout, submit a
     question, see status.
101. **`storefront/lighthouserc.json`** (Create) — Lighthouse CI assertions
     (Performance 0.9, Accessibility 1.0) for the three public pages, run by
     hand until CI exists.

### Build order

1.  Milestones 1–2 (Salesforce foundation, earn and checkout): files 8–57.
2.  Milestone 3 (storefront): files 62–101 with the mock backend first, then
    `SalesforceBackend` once the org and integration user exist.
3.  Milestone 4 (fulfilment): Flows 58–61, email webhook 93, Cal.com 94, Blob
    upload 91.
4.  Milestone 5 (concierge): files 44, 76, 92, agent metadata.
5.  Milestone 6 (launch): `how-its-built`, Lighthouse, domain, setup docs.

In this session, files are written for all milestones. Salesforce files can be
checked only by formatting and review until an org exists; the storefront is
checked end to end against the mock.

### Verification Plan

*   **Compilation/Build**: `npm run build` in `storefront/`;
    `sf project deploy validate --source-dir force-app` once an org is
    authorised.
*   **Unit Tests**: `npm test` (Vitest: unit tests plus contract scenarios on
    the mock); `sf apex run test --code-coverage --result-format human` in the
    org.
*   **Static Analysis & Linting**: `npm run lint` and `npm run typecheck` in
    `storefront/`; `npm run format:check` in `salesforce/`.
*   **Test Coverage Requirement**: 90% or more org-wide Apex coverage, and
    every class at 85% or more.
*   **E2E/Integration**: `npm run test:e2e` (Playwright on the mock);
    `npm run test:contract:salesforce` against the real org; manual
    walk-through of CUJ 1–5 on the Vercel preview before launch; Lighthouse CI
    on the three public pages.

--------------------------------------------------------------------------------

*Drafted with EGM*
