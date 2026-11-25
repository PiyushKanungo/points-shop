# Piyush's Points Shop

A personal shop where visitors earn points by interacting with Piyush, then spend them on real
services he delivers: an SFCC question answered by email, a resume review, a career chat and a
mock interview. No money changes hands.

It is a portfolio project showing a **headless commerce architecture**: a Next.js storefront in
front, and Salesforce (Apex, Flows, Agentforce) as the back end, connected by a REST API.

```text
Browser ──> Next.js on Vercel ──(OAuth client credentials, Apex REST)──> Salesforce Developer Edition
                 │                                                        objects, Apex service classes,
                 └── Email (Gmail, Resend or Salesforce), Vercel BotID     Flows, Agentforce concierge
```

## Repository layout

| Path | What it holds |
| --- | --- |
| `salesforce/` | Salesforce DX project: custom objects, validation rules, Apex service classes, Apex REST API, triggers, tests, seed data |
| `storefront/` | Next.js 16 storefront (App Router, Cache Components, Tailwind v4): catalogue, ways to earn, magic-link sign-in, cart, points checkout, orders |
| `docs/setup-vercel.md` | Resend, Turnstile and Vercel setup for a live deployment |
| `docs/prd.md` | Product requirements |
| `docs/designs/points_shop_v1.md` | The design, reviewed with the Elephant-Goldfish workflow |
| `docs/setup-org.md` | How to create the org, deploy, seed and create the API user |
| `docs/spike-agentforce.md` | The milestone 1 Agentforce test and its results |
| `*_report.md` | Review records from the design review |

## Status

Live at [points-shop.vercel.app](https://points-shop.vercel.app).

| Milestone | Status |
| --- | --- |
| 1 Salesforce foundation (objects, ledger, triggers, seed data) | Done (Agentforce test results in docs/spike-agentforce.md) |
| 2 Earn and checkout (service classes, REST API) | Done: 96 Apex tests pass, 94% org-wide coverage (25 November 2026) |
| 3 Storefront | Done: deployed to Vercel against the Salesforce org |
| 4 Fulfilment (details, private resume upload, on-site booking, Flows) | Done: order status Flows active |
| 5 Agentforce concierge | Done: agent v2 active, called from the storefront chat through Apex |
| 6 Launch | Done: deployed to production with bot protection and email limits |

## Run the storefront locally

No Salesforce org needed: the storefront ships with a stub API.

```bash
cd storefront
npm install
cp .env.example .env.local   # then fill SESSION_SECRET and MAGIC_LINK_SECRET with random 32+ character strings
npm run dev
```

Sign-in emails are written to `storefront/.local-email/` instead of being sent; open the newest
`*-magic-link.json` and follow the link. Checks: `npm run lint`, `npm run typecheck`, `npm test`,
`npm run build:check` (build plus a scan for leaked secrets), `npm run test:e2e` (Playwright).

## Deploy the back end

Follow [docs/setup-org.md](docs/setup-org.md). In short, from `salesforce/`:

```bash
npm install
npm run format:check
sf org login web --alias points-shop --set-default
npm run deploy
sf org assign permset --name Shop_Admin
npm run seed
npm run test
```

## How points stay correct

- Every points change is an entry in `Points_Ledger__c`, written only by `LedgerService`.
- A wallet's balance is a roll-up of its ledger; a validation rule rejects any change that would
  make it negative, so the database itself refuses an overspend.
- Each entry has a unique idempotency key, so a retried checkout or task counts once.
- Checkout locks the wallet before it checks for a repeat, so two identical requests at the same
  moment place one set of orders.
- Ledger entries cannot be edited or deleted one by one.

## API

`/services/apexrest/shop/v1/...`, called only by the storefront server. Endpoints, JSON shapes and
error codes are in section 4 of the [design](docs/designs/points_shop_v1.md#4-api-contract-apex-rest-servicesapexrestshopv1).
