# Stage 6: Comprehension Test

**Target:** `docs/designs/points_shop_v1.md` (FeatureRange 1–645, DetailedRange 646–1024), read alone.
**Reviewer:** `egm-comprehension` — completed. No Blockers, 7 Major, 9 Nit.

**What this proposes**

Points Shop is a portfolio web shop. Visitors sign in with an email magic link,
get 50 welcome points, earn more by doing tasks (exploring the site, sending
feedback, LinkedIn clicks, referrals, reviews), and spend points on four
services Piyush delivers by hand (an SFCC question, a resume review, a career
chat, a mock interview). No money is involved.

A Next.js storefront on Vercel is the only thing that talks to a Salesforce
Developer Edition org. The org holds the catalogue, one wallet per email, an
append-only ledger with a roll-up balance that cannot go below zero, earn
tasks, completions and orders. Apex services enforce idempotency, task limits
and checkout/refund rules, and Apex REST endpoints expose them.

Record-triggered Flows decide when an email is due and send a signed webhook to
Next.js, which sends the email through Resend. An Agentforce "Shop Concierge",
reached through the Agent API from the server, answers balance, earning and
recommendation questions and can place orders. The wallet is bound through a
server-set context variable. A mock backend with the same rules lets the
storefront run without an org; shared contract tests check that the mock and
Salesforce behave the same.

**How the existing system works, per this document**

Nothing exists yet. The repository holds only `docs/prd.md`, and no Salesforce
org has been created. The only "existing system" described is the outside
constraints: Developer Edition limits (15 Flow and 50 total emails per day, 150
Agentforce requests per hour, about 5 MB storage, 15,000 API calls per day,
termination after 45 days without login), the fact that individuals cannot get
a B2C Commerce sandbox, and Piyush's SFRA background against a market asking
for headless SFCC experience.

The reviewer could paraphrase every section.

## Findings

### Major

| ID | Finding | Lines | Recommendation |
| --- | --- | --- | --- |
| C1 | The SFCC mapping table is a core deliverable (Problem, Goal 7, CUJ 3, file 84) but never appears. The claim that the API "mirrors SCAPI's basket-to-order flow" cannot be checked: the cart is a cookie and the API has no basket resource. SCAPI is not expanded. | 46–51, 57–59, 99–101, 175, 940 | Add the mapping table to the Technical Plan; say the basket lives only in the storefront; expand or link SCAPI. |
| C2 | Task list and point values are incomplete. Goal 1 cites "the 100-point service" but no prices are listed; only seven tasks are named while line 691 says eight; `Max_Per_Wallet__c` per task is never given, yet CUJ 6 relies on it. | 77–79, 145–146, 463–472, 689–692 | Add tables of services (slug, type, placeholder price) and tasks (key, verification, points, max per wallet), marked as PRD placeholders. |
| C3 | The email webhook carries only the first part of the address, so it is unclear how Next.js knows the recipient (callback to Salesforce, or full email in the payload). | 389–394, 404–407, 893 | List the payload fields, including the recipient; add any callback endpoint to section 4. |
| C4 | The Cal.com webhook has no session, but every order endpoint is wallet-scoped and routes take the wallet "from the session cookie". It is not said how the webhook gets the wallet, which endpoint it calls, or whether the booking moves the order to In Progress. | 362, 366–367, 479–482, 958–959 | Describe the server-to-server path and mark it as an exception to the session rule. |
| C5 | The concierge's running user and record access are not stated. An Agentforce Service Agent runs as its own agent user, not the integration user; objects are Private and services run `with sharing`. | 282–290, 416–433, 749–752 | Name the agent user, its permission set and sharing, and how `with sharing` applies. |
| C6 | The fallback's "two actions that need no wallet" do not match the defined actions (both take `walletId`). Under the fallback, Goal 6 and CUJ 5 cannot be met, and this is not stated. Who supplies `checkoutKey` to `ConciergeStartOrder` is unclear. | 95–98, 136–139, 185–192, 420–433 | Define fallback signatures; state what Goal 6 and CUJ 5 become; say where the concierge checkout key comes from. |
| C7 | Concurrent double checkout: step 1 checks `Checkout_Key__c` before step 2 locks the wallet; `Checkout_Key__c` is not unique and the Redeem key is per order, so two simultaneous submits could both pass. | 80–84, 275, 321–331 | Re-check after the lock, or make the key unique (or derive the Redeem key from the checkout key), and state the guarantee. |

### Nit

| ID | Finding | Recommendation |
| --- | --- | --- |
| C8 | No store is named for the "5 messages per wallet per day" limit. | Name where the counter lives. |
| C9 | Who calls the details endpoint with `resumeUrl` after upload, and whether the server checks it is the issued blob, is vague. | Describe upload completion to `saveDetails`. |
| C10 | The explore check uses a client-controlled cookie; `Verification__c` values are undefined. | Say it is honour-system; define each value. |
| C11 | Once-only vs repeatable tasks are not defined. | State the rule (`Max_Per_Wallet__c = 1`?). |
| C12 | No mechanism for Piyush to post Adjustment entries; Adjustment's sign rule unstated. | Name the mechanism (for example an anonymous Apex script) and the sign rule. |
| C13 | Referral gaps: when `Referred_By__c` is set; behaviour with an existing unconfirmed wallet or a different code later. | One sentence on storing and resolving `referralCode`. |
| C14 | Inconsistencies: Goal 5 says Flows send emails; verify page posts the hash (l.377) vs token (l.600); "Agent API credentials" secret vs `.env.example`; `postAll` undefined in §3; `Tags__c` missing from §2; `how-its-built` in milestones 3 and 6. | Reconcile each pair. |
| C15 | Undefined terms: "the other two portfolio projects", "milestone 5" before milestones are listed, "Claude" and "EGM", "in this session", the design file marked Create, Buy Me a Coffee vs "No payments", purpose of `Storefront_Url__c` and `Owner_Email__c`. | Define or remove each. |
| C16 | A two-service checkout sends two confirmation emails and two alerts; CUJ 1 says "a confirmation email". | State it is intended, or combine them. |
