# PRD: Points Shop on Salesforce

*   **Source:** https://claude.ai/artifact/Uwx4XjhFqFQALB4sgytZ7N (local copy, rev 17, taken 2026-11-12)
*   **Date:** 2026-11-08
*   **Author:** Piyush
*   **Status:** Draft

Draft for the main portfolio project, ready to take into a build session. A personal points shop whose
business logic runs on Salesforce (Apex, Agentforce, Flows) behind a headless React front end. It is one of
three portfolio projects: this shop, the published SFCC Sandbox Switcher VS Code extension, and a short
Storefront Next template audit.

## Why this project exists

The project has to close the gap that kept Piyush out of the better-paying SFCC roles in the November 2026
job search, and give recruiters something to see.

- **The headless gap.** New SFCC builds are moving to composable storefronts. VML, PVH, Arohana and ERPTREE
  asked for PWA Kit or Storefront Next, and a Hydus client is migrating to Storefront Next in 2027. Piyush's
  experience so far is SFRA.
- **No public proof.** His resume describes SFRA, SCAPI/OCAPI, Service Framework and Business Manager work at
  Capgemini, but nothing a recruiter can open or try.
- **Generic projects don't help.** A re-skinned Salesforce template looks like every other candidate's. The
  project must carry Piyush's own story and decisions.

Free Salesforce Developer Edition orgs now include Agentforce and Data Cloud, so this project can show
hands-on Apex, Agentforce and Flows legitimately. A personal B2C Commerce sandbox is not available to
individuals, so SFCC itself is covered by the other two projects.

**Success** means the project earns interview calls for headless SFCC roles (3–5 years band) and gives Piyush
10 minutes of specific, honest material to talk through in an interview.

## About Piyush

The shop sells what only Piyush can offer: his own time and SFCC know-how.

- Salesforce Certified B2C Commerce Developer, Associate Consultant at Capgemini since March 2024 (SFRA,
  SCAPI/OCAPI, Service Framework integrations, Business Manager jobs, checkout, hypercare).
- Part-time founding engineer at Fluxenta (Sep 2025 – Jun 2026): built a saree storefront's UI, Razorpay
  checkout and OTP sign-in.
- Based in Noida; React and TypeScript since college.
- Personality for the site: approachable and a little playful, not a corporate brochure. In his words, "not a
  Google employee people are dying to talk to", so the tone is friendly and low-pressure.

## Who it is for

| Who | Why they visit | What they need in 2 minutes |
| --- | --- | --- |
| Recruiters and hiring managers | Clicked the link on Piyush's resume or LinkedIn | See that he built and runs a real, working commerce system; a short "how it's built" page; the code on GitHub |
| Developers, students, Salesforce job-seekers | Want help: a resume review, an SFCC question, interview practice | Understand the shop in seconds, earn points easily, get real help delivered |

The second group is how the shop proves itself to the first: real orders delivered are the evidence.

## The product

**A personal shop where visitors earn points by interacting with Piyush, then spend them on his real
services, which he actually delivers.** Nobody has to pay; a Buy Me a Coffee link is there for anyone who
wants to.

**What's for sale (v1 draft, prices in points):**

| Service | How it's delivered | Points |
| --- | --- | --- |
| Ask an SFCC developer | Visitor types a question; Piyush replies by email within 48 h | 100 |
| Resume review for Salesforce / SFCC developers | Visitor uploads a PDF; gets an annotated review back within 3 days | 250 |
| 20-minute career chat | Visitor books a slot; video link sent automatically | 300 |
| Mock SFCC interview (45 min) | Visitor books a slot; call plus written feedback | 500 |

**Ways to earn (v1 draft):**

| Task | Verified how | Points |
| --- | --- | --- |
| Sign up with email | Confirmation link | 50 |
| Explore the site (visit 3 pages, including "How it's built") | Tracked on the site | 30 |
| Give feedback on the site | Feedback form submitted | 50 |
| Send Piyush an email | Sent through the site from the confirmed address | 40 |
| Read and react to one of his LinkedIn posts | Honour system (link click only) | 20 |
| Say hi on LinkedIn | Honour system (link click only), once per person | 20 |
| Refer a friend who signs up | Referral link plus the friend's confirmation | 100 |
| Leave a review after a delivered service | Review submitted on a completed order | 75 |

LinkedIn tasks earn little and only once, because LinkedIn offers no way to verify them and rewarding
connections heavily could look like inflated engagement. Point values are placeholders, tuned so a first
service takes a few genuine actions, not one click.

## Key journeys

**Visitor: earn and redeem**

1. Lands on the shop, sees services priced in points and a "Ways to earn" panel.
2. Signs up with email (magic link, no password) and gets 50 welcome points.
3. Completes a few tasks; the points balance updates live.
4. Adds a service to the cart and checks out with points.
5. Gets a confirmation email with next steps: book a slot, upload a resume, or type the question.
6. Piyush delivers; the order moves to Delivered and the visitor is invited to leave a review (more points).

**Recruiter: two-minute look**

1. Opens the link from the resume; sees a working shop, not a static page.
2. Opens "How it's built": architecture, the order pipeline, and how it maps to SFCC concepts.
3. Optionally tries it: signs up, earns points, places an order.
4. Follows the GitHub link to the code.

**Piyush: fulfil an order**

1. Gets an email or notification for each new order.
2. Opens the shop's order list in the Salesforce app: open orders, linked resumes or questions, booked slots.
3. Delivers (replies, uploads the review, joins the call) and marks the order Delivered, which emails the
   visitor.

## Scope

**v1 must-haves**

- Developer Edition org with the custom objects, validation rules and record access set up.
- Apex service layer for earning, the ledger and checkout, with triggers through a handler framework and
  90%+ test coverage.
- Apex REST API for catalogue, wallet, task completion, orders and order status, secured by a Connected App.
- Next.js storefront: service catalogue, "Ways to earn" panel, live balance, cart and points checkout, order
  status page.
- Email magic-link sign-in on the storefront, with a `Wallet__c` per confirmed email and 50 welcome points.
- Fulfilment inputs per service: question form, resume upload (external storage), Cal.com booking.
- Record-triggered Flows for welcome, order confirmed and delivered emails.
- Agentforce concierge with Apex actions: check balance, explain how to earn, recommend a service, start an
  order.
- "How it's built" page with the architecture and the SFCC mapping, plus a Buy Me a Coffee link.

**Later**

- Pay with money as an alternative to points (Razorpay).
- Public reviews on each service.
- Promotions such as a double-points week, modelled like SFCC promotions.
- A Lightning Web Component admin dashboard (open orders, points issued, top tasks).
- CI: Apex tests and front-end tests on every pull request (GitHub Actions with the Salesforce CLI).

**Not doing**

- No physical products, shipping or inventory.
- No Salesforce Commerce Cloud backend: it needs an enterprise licence and individuals cannot get a B2C
  sandbox. SFCC is covered by the other two portfolio projects.
- No files stored in Salesforce (the org has about 5 MB of data storage).
- No tracking of LinkedIn activity beyond a link click (no scraping, no automation).

## Technical approach

Salesforce is the backend: the data, business rules, automation and AI concierge live in a free Developer
Edition org with Agentforce. A headless React site is the shop window and talks to Salesforce only from its
server.

(Architecture diagram in the source doc: 1 server, 4 services.)

Every points change, whether from the site, the agent or Piyush, goes through the Apex service layer into one
append-only ledger, so a balance can never be spent twice or go negative.

| Layer | Built with | What it proves |
| --- | --- | --- |
| Data model | Custom objects: `Service__c`, `Wallet__c` (one per visitor, keyed by email), `Points_Ledger__c` (append-only entries), `Earn_Task__c`, `Task_Completion__c`, `Shop_Order__c` | Data modelling, validation rules, record access |
| Business logic | Apex service classes (`LedgerService`, `EarnService`, `CheckoutService`), one trigger per object through a handler framework, bulk-safe and within governor limits | Apex design, triggers, governor limits |
| Tests | Apex test classes with test data factories, 90%+ coverage, negative cases (double spend, over-limit earns) | Testing discipline |
| API | Apex REST (`@RestResource`): catalogue, wallet, complete task, place order, order status | Headless Salesforce, API design |
| Integration auth | Connected App with OAuth client credentials, called only from the React server, never the browser | Secure integration |
| Automation | Record-triggered Flows: welcome, order confirmed, order delivered emails | Declarative automation |
| AI concierge | Agentforce agent with topics and custom Apex invocable actions: check balance, explain how to earn, recommend a service, start an order | Agentforce, Apex actions, prompt guardrails |
| Front end | React with Next.js (App Router), TypeScript, Tailwind; email magic-link sign-in; chat panel calling the agent through the server | Headless architecture, React/TS |
| Booking and files | Cal.com for calls; resumes in external storage (Vercel Blob), linked from the order | Fits the org's small storage |
| Hosting | Front end on Vercel (shop.piyushkanungo.com or similar); backend in the Developer Edition org | Free tiers |

**Developer Edition constraints the design must respect**
([Salesforce Help](https://help.salesforce.com/s/articleView?language=en_US&id=xcloud.overview_developer_edition_agentforce_datacloud.htm&type=5)):

- 150 Agentforce LLM requests per hour: fine for a personal site; the chat shows a friendly "busy, try later"
  when limited.
- About 5 MB of data storage: no files in Salesforce, small text records only.
- The org is terminated after 45 days with no user login: Piyush logs in regularly (the admin work does this).
- Salesforce offers Developer Edition for building and learning, not as a supported production service: the
  site is labelled a personal portfolio project, with no uptime promises.

**How it maps to SFCC** (the interview angle: the same commerce concepts, on the Salesforce platform):

| This shop | SFCC equivalent |
| --- | --- |
| `Service__c` priced in points | Catalog + price book (points as a currency) |
| `Wallet__c` + `Points_Ledger__c` | Loyalty balance / gift certificate ledger |
| `Earn_Task__c` rules with limits | Promotions + customer groups |
| Cart → points checkout → `Shop_Order__c` statuses | Basket → order → order status lifecycle (SCAPI Shopper Baskets and Orders) |
| Flows and the admin view | Order notifications + Business Manager order management |
| Apex REST consumed by a React head | SCAPI consumed by PWA Kit / Storefront Next |

## Success criteria

The shop succeeds when real people use it and recruiters notice it. Targets for the first 3 months after
launch, to be adjusted once real numbers come in:

| Measure | Target | How it's measured |
| --- | --- | --- |
| Services delivered | 10 | Orders marked Delivered |
| Sign-ups | 50 | Wallets created |
| Reviews left | 5 | Reviews on delivered orders |
| Recruiter conversations that mention the shop | 3 | Piyush's own log |
| Lighthouse (mobile) on the shop pages | Performance ≥ 90, Accessibility 100 | Lighthouse CI on every pull request |
| Points integrity | Zero negative balances or double spends | Database constraints + tests |

## Milestones

About 5–6 weeks to a live v1 at roughly 7 hours a week, alongside the full-time job. Each milestone ends with
something that works and is deployed.

1. **Salesforce foundation (week 1):** sign up for a Developer Edition with Agentforce, set up the Salesforce
   CLI and a source-tracked repo, create the custom objects, and build the `LedgerService` with tests.
2. **Earn and checkout logic (week 2):** `EarnService` and `CheckoutService` with limits and tests, triggers
   through a handler framework, and the Apex REST endpoints behind a Connected App.
3. **Storefront (week 3):** Next.js app on Vercel, magic-link sign-in, catalogue, ways to earn, balance, cart
   and points checkout against the Apex REST API.
4. **Fulfilment (week 4):** question form, resume upload, Cal.com booking, Flows for the order emails, and the
   order view for Piyush in the Salesforce app.
5. **Agentforce concierge (week 5):** agent topics, Apex invocable actions, guardrails, and the chat panel on
   the storefront.
6. **Launch (week 6):** "How it's built" page, Lighthouse check, Buy Me a Coffee link, domain, then a LinkedIn
   post announcing it.

Each milestone is designed with the Elephant-Goldfish workflow (brainstorm, draft, review) before coding.

## Open questions

- [ ] Does Piyush's Capgemini contract allow free SFCC help on the side (resume reviews, interview practice,
  coaching)? Check the side-work / conflict-of-interest clause before launch.
- [ ] Front end: headless React (proposed) or Lightning Web Components on an Experience Cloud site?
- [ ] How the storefront calls the Agentforce agent: the Agent API from the React server, or Salesforce's
  embedded messaging widget? Check which the Developer Edition supports.
- [ ] Which services go live first: all 4, or start with 2?
- [ ] Final point values for services and tasks.
- [ ] Any task ideas of Piyush's own beyond email, feedback, LinkedIn and referrals?
- [ ] A name for the shop, and where it lives (shop.piyushkanungo.com or a section of the existing portfolio
  site).
- [ ] Realistic hours per week, which sets the milestone dates.
