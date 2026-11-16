# Put the storefront online

Do these after the Salesforce org works ([setup-org.md](./setup-org.md), phases 1 and 2). Each step
says what you need to do yourself and what to send back.

## 1. Resend (email)

1. Sign up at [resend.com](https://resend.com) with the email you want order alerts on.
2. API Keys → Create API key (permission: Sending access). Copy it once; it's shown only once.
3. Until you own a domain, send from `Points Shop <onboarding@resend.dev>`. Resend only delivers
   these to the email you signed up with, which is enough to test the whole journey yourself.
4. Later, with a domain: Domains → Add domain, add the DNS records it shows, then change
   `EMAIL_FROM` to an address on that domain so visitors receive emails too.

## 2. Cloudflare Turnstile (bot check)

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) (a free account is enough) →
   Turnstile → Add widget.
2. Widget mode: Managed. Hostnames: your Vercel domain(s), for example `points-shop.vercel.app`.
3. Copy the **site key** and **secret key**. Previews can keep using the test keys in
   `.env.example`.

## 3. GitHub and Vercel

1. Create an empty GitHub repository and push this project:

   ```bash
   git remote add origin https://github.com/<you>/points-shop.git
   ```

   ```bash
   git push -u origin main
   ```

2. Sign in at [vercel.com](https://vercel.com) with GitHub → Add New → Project → import the repo.
3. **Root Directory: `storefront`**. Framework preset: Next.js (detected).
4. Environment variables (Settings → Environment Variables). Use the **Preview** and
   **Production** scopes:

   | Variable | Value |
   | --- | --- |
   | `SHOP_BACKEND` | `salesforce` |
   | `SITE_URL` | `https://<your-project>.vercel.app` (previews use their branch URL automatically) |
   | `SESSION_SECRET`, `MAGIC_LINK_SECRET` | two different random strings, 32+ characters each |
   | `SF_LOGIN_URL` | your org's My Domain URL, for example `https://yourdomain.my.salesforce.com` |
   | `SF_CLIENT_ID`, `SF_CLIENT_SECRET` | from the External Client App (setup-org.md phase 2) |
   | `RESEND_API_KEY` | from step 1 |
   | `EMAIL_FROM` | `Points Shop <onboarding@resend.dev>` for now |
   | `OWNER_EMAIL` | where new-order alerts and visitor messages go |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | from step 2 (test keys are fine for Preview) |
   | `GITHUB_URL` | `https://github.com/PiyushKanungo/points-shop` |
   | `BMAC_URL`, `LINKEDIN_URL` | optional footer links |

5. Deploy. The build fetches the catalogue from Salesforce, so the org must be reachable.

## 4. Resume uploads and bookings (milestone 4)

1. **Vercel Blob:** in the Vercel project → Storage → Create Database → Blob → connect it to the
   project. Vercel adds `BLOB_READ_WRITE_TOKEN` itself. Redeploy.
2. **Cal.com:** sign up at [cal.com](https://cal.com/signup) and create two event types,
   "Career chat" (20 min) and "Mock interview" (45 min). In each event's Advanced settings, hide it
   from your profile. Put the two booking links into the two booking offerings in Salesforce
   (Points Shop app → Offerings → Booking URL).
3. **Cal.com webhook:** Settings → Developer → Webhooks → New: subscriber URL
   `https://<your-project>.vercel.app/api/webhooks/calcom`, event **Booking Created**, and a secret
   you make up. Add the same secret to Vercel as `CALCOM_WEBHOOK_SECRET` and redeploy.
4. **Salesforce label:** Setup → Custom Labels → `Shop_Storefront_Url` → set it to your Vercel URL,
   so the delivered and cancelled emails link to the right site.

## 5. Check it works

On the deployment URL: sign in with your own email, earn 100 points (explore three pages
including How it's built, then a LinkedIn task), add "Ask an SFCC developer" to the cart and check
out. You should get the welcome, order-confirmed and new-order emails, and see the order in the
Salesforce app under Shop Orders → Open Orders.

Optional: run the API smoke test against the org from your machine:

```bash
cd storefront
```

```bash
SMOKE=1 SF_LOGIN_URL=https://yourdomain.my.salesforce.com SF_CLIENT_ID=... SF_CLIENT_SECRET=... npm run test:smoke
```
