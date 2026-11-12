# Set up the Salesforce org

These steps take the `salesforce/` project from this repository to a working back end in a free
Salesforce Developer Edition org. Phase 1 covers milestone 1; phase 2 adds the API user for
milestone 2.

## Phase 1: org, deploy, seed data

1. **Sign up for Developer Edition with Agentforce.** Use the sign-up page linked from
   [Developer Edition with Agentforce and Data Cloud](https://help.salesforce.com/s/articleView?language=en_US&id=xcloud.overview_developer_edition_agentforce_datacloud.htm&type=5).
   Use an email you check; the org is terminated after 45 days without a login.
2. **Install the Salesforce CLI** (`sf`) from
   [developer.salesforce.com/tools/salesforcecli](https://developer.salesforce.com/tools/salesforcecli),
   then check it: `sf --version`.
3. **Log in to the org** from the `salesforce/` folder:

   ```bash
   cd salesforce
   sf org login web --alias points-shop --set-default
   ```

4. **Install the formatting tools and deploy:**

   ```bash
   npm install
   npm run format:check
   npm run deploy
   ```

5. **Give yourself access** to the app, tabs and objects:

   ```bash
   sf org assign permset --name Shop_Admin
   ```

6. **Load the catalogue and earn tasks:**

   ```bash
   npm run seed
   ```

   Then open the **Points Shop** app (App Launcher), go to **Offerings**, and replace the
   placeholder Cal.com URLs on the two booking offerings. Replace the placeholder LinkedIn URLs on
   the two LinkedIn tasks under **Earn Tasks**.

7. **Run the Apex tests:**

   ```bash
   npm run test
   ```

   Phase 1 exit check: the deploy succeeds and `LedgerServiceTest`, `TriggerHandlerTest` and
   `WalletTriggerHandlerTest` pass.

8. **Run the Agentforce test** in [spike-agentforce.md](./spike-agentforce.md) and fill in its
   results table.

## Phase 2: API user and External Client App

The Next.js server calls the Apex REST API as a dedicated API-only user with the OAuth client
credentials flow.

1. **Create the integration user.** Setup → Users → New User:
   - User licence: **Salesforce Integration**
   - Profile: **Minimum Access - API Only Integrations**
   - Email: one you control; username: anything unique, for example
     `shop-integration@<your-org-domain>`.

   Then on the user: **Permission Set License Assignments** → assign **Salesforce API
   Integration**; **Permission Set Assignments** → assign **Shop Integration**.

   If the Salesforce Integration licence is not available in your org, use a standard Salesforce
   licence with the **Minimum Access - Salesforce** profile and the **Shop Integration** permission
   set, and note it in the README.

2. **Create an External Client App.** Setup → External Client App Manager → New External Client
   App:
   - Name: `Points Shop Storefront`
   - Enable OAuth; callback URL `https://localhost/callback` (not used by this flow)
   - OAuth scopes: **Manage user data via APIs (api)**
   - Enable **Client Credentials Flow**
   - In the app's policies, set the **Run As** user for the client credentials flow to the
     integration user.

   If your org still offers **New Connected App** (Setup → App Manager), a Connected App with the
   same settings works too.

3. **Copy the consumer key and secret** from the app's settings. They go into the storefront's
   Vercel environment variables (`SF_CLIENT_ID`, `SF_CLIENT_SECRET`) in milestone 3. Never commit
   them.

4. **Test the API with curl.** Replace `<my-domain>` with your org's My Domain host (Setup → My
   Domain):

   ```bash
   curl -s -X POST "https://<my-domain>.my.salesforce.com/services/oauth2/token" -d "grant_type=client_credentials" -d "client_id=$SF_CLIENT_ID" -d "client_secret=$SF_CLIENT_SECRET"
   ```

   Take `access_token` from the response, then:

   ```bash
   curl -s "https://<my-domain>.my.salesforce.com/services/apexrest/shop/v1/catalog" -H "Authorization: Bearer $ACCESS_TOKEN"
   ```

   Phase 2 exit check: this returns the four offerings and eight tasks, and `npm run test` passes
   with org-wide coverage of 90% or more and every class at 85% or more.

## Monthly housekeeping

Log in at least once a month (it keeps the org alive), check Setup → Storage Usage, and export the
data:

```bash
sf data export tree --query "SELECT Id, Email__c, Referral_Code__c, First_Sign_In_At__c FROM Wallet__c" --output-dir backup
```

Setup → Data Export → Schedule Export is an alternative if your org offers it.

## Privacy deletion

To delete a visitor's data, set the email at the top of `scripts/apex/delete-wallet.apex` and run:

```bash
sf apex run --file scripts/apex/delete-wallet.apex
```

Then delete any resume files it lists from Vercel Blob.
