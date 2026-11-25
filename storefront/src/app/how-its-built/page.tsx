import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it's built",
  description: "A headless commerce architecture: Next.js storefront, Salesforce back end, Apex REST in between.",
};

const MAPPING: Array<[string, string]> = [
  ["Offerings priced in points (Service__c)", "Catalog products and a price book"],
  ["Wallet + append-only points ledger", "Loyalty balance / gift certificate transaction history"],
  ["Earn tasks with per-person limits", "Promotions with customer groups and usage limits"],
  ["Cart cookie → POST /checkout → orders", "SCAPI Shopper Baskets → Shopper Orders (create order from basket)"],
  ["Order statuses: Awaiting Details → In Progress → Delivered / Cancelled", "Order status lifecycle"],
  ["Salesforce app list views + Flows", "Business Manager order management + order emails"],
  ["Agentforce concierge scoped to one wallet per chat", "Shopper Agent for storefronts"],
  ["Apex REST consumed by a Next.js server", "SCAPI consumed by PWA Kit or Storefront Next"],
];

const LIFECYCLE = ["Awaiting Details", "In Progress", "Delivered"];

function ArchitectureDiagram() {
  return (
    <svg viewBox="0 0 720 300" role="img" aria-labelledby="arch-title arch-desc" className="h-auto w-full">
      <title id="arch-title">System architecture</title>
      <desc id="arch-desc">
        The browser talks only to the Next.js storefront on Vercel. The storefront server calls Salesforce through
        Apex REST using OAuth client credentials, and uses Cloudflare Turnstile for bot checks. Salesforce Flows send the emails.
      </desc>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--muted)" />
        </marker>
      </defs>
      <g fontFamily="inherit" fontSize="14" fill="var(--ink)">
        <rect x="20" y="115" width="130" height="70" rx="12" fill="var(--card)" stroke="var(--line)" strokeWidth="2" />
        <text x="85" y="146" textAnchor="middle" fontWeight="600">Browser</text>
        <text x="85" y="166" textAnchor="middle" fontSize="12" fill="var(--muted)">no credentials</text>

        <rect x="230" y="95" width="200" height="110" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" />
        <text x="330" y="132" textAnchor="middle" fontWeight="600">Next.js storefront</text>
        <text x="330" y="152" textAnchor="middle" fontSize="12" fill="var(--muted)">Vercel · pages + /api routes</text>
        <text x="330" y="172" textAnchor="middle" fontSize="12" fill="var(--muted)">session cookie → wallet ID</text>

        <rect x="510" y="70" width="190" height="160" rx="12" fill="var(--card)" stroke="var(--line)" strokeWidth="2" />
        <text x="605" y="102" textAnchor="middle" fontWeight="600">Salesforce</text>
        <text x="605" y="126" textAnchor="middle" fontSize="12" fill="var(--muted)">Apex REST /shop/v1</text>
        <text x="605" y="146" textAnchor="middle" fontSize="12" fill="var(--muted)">LedgerService · Checkout</text>
        <text x="605" y="166" textAnchor="middle" fontSize="12" fill="var(--muted)">Flows · Agentforce</text>
        <text x="605" y="186" textAnchor="middle" fontSize="12" fill="var(--muted)">custom objects + rules</text>

        <rect x="250" y="235" width="160" height="44" rx="10" fill="var(--card)" stroke="var(--line)" strokeWidth="2" />
        <text x="330" y="262" textAnchor="middle" fontSize="12">Cloudflare Turnstile</text>

        <line x1="150" y1="150" x2="226" y2="150" stroke="var(--muted)" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1="430" y1="150" x2="506" y2="150" stroke="var(--muted)" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="468" y="140" textAnchor="middle" fontSize="11" fill="var(--muted)">OAuth</text>
        <line x1="330" y1="205" x2="330" y2="231" stroke="var(--muted)" strokeWidth="2" markerEnd="url(#arrow)" />
      </g>
    </svg>
  );
}

export default function HowItsBuiltPage() {
  return (
    <article className="space-y-12">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">How it&apos;s built</h1>
        <p className="text-lg text-muted">
          A small headless commerce system. The storefront is a separate Next.js app; Salesforce holds the data and
          the rules; an API sits between them, the same shape as a PWA Kit or Storefront Next build on SCAPI.
        </p>
      </header>

      <section aria-labelledby="arch" className="space-y-4">
        <h2 id="arch" className="text-2xl font-bold tracking-tight">Architecture</h2>
        <div className="card p-4 sm:p-6">
          <ArchitectureDiagram />
        </div>
        <ul className="grid gap-3 text-sm sm:grid-cols-3">
          <li className="card p-4">
            <strong>Server-only Salesforce.</strong> The browser never sees a Salesforce token; the storefront server
            calls the API with OAuth client credentials.
          </li>
          <li className="card p-4">
            <strong>One ledger.</strong> Every point is an append-only ledger entry; the balance is a database
            roll-up that a validation rule keeps at zero or above.
          </li>
          <li className="card p-4">
            <strong>Safe retries.</strong> Each checkout and task has a unique key and locks the wallet, so a
            double click counts once.
          </li>
        </ul>
      </section>

      <section aria-labelledby="lifecycle" className="space-y-4">
        <h2 id="lifecycle" className="text-2xl font-bold tracking-tight">Order lifecycle</h2>
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {LIFECYCLE.map((status, i) => (
            <li key={status} className="flex items-center gap-2">
              <span className="pill bg-accent-soft px-3 py-1 text-accent">{status}</span>
              {i < LIFECYCLE.length - 1 && <span aria-hidden>→</span>}
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">
          Checkout creates one order per offering and redeems the points. The visitor adds their question, resume or
          booking (In Progress); Piyush delivers in Salesforce, which sends the email. Cancelling refunds the points
          exactly once.
        </p>
      </section>

      <section aria-labelledby="sfcc" className="space-y-4">
        <h2 id="sfcc" className="text-2xl font-bold tracking-tight">How it maps to SFCC</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper">
              <tr>
                <th scope="col" className="p-3 font-semibold">This shop</th>
                <th scope="col" className="p-3 font-semibold">SFCC / SCAPI equivalent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MAPPING.map(([shop, sfcc]) => (
                <tr key={shop}>
                  <td className="p-3">{shop}</td>
                  <td className="p-3 text-muted">{sfcc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
