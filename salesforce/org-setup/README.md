# Org setup done from the command line

These steps replace the Setup clicks in `docs/setup-org.md` phase 2. Run from `salesforce/` after
`npm run deploy`. Replace the username suffix with one unique to your org.

## 1. Integration user

```bash
sf data query --query "SELECT Id FROM Profile WHERE Name = 'Minimum Access - API Only Integrations'"
```

```bash
sf data create record --sobject User --values "LastName='Shop Integration' FirstName='Points' Alias='shopint' Username='shop-integration.<org-id>@points-shop.dev' Email='<your email>' ProfileId='<profile id>' TimeZoneSidKey='Asia/Kolkata' LocaleSidKey='en_IN' EmailEncodingKey='UTF-8' LanguageLocaleKey='en_US'"
```

```bash
sf org assign permsetlicense --name SalesforceAPIIntegrationPsl --on-behalf-of shop-integration.<org-id>@points-shop.dev
```

```bash
sf org assign permset --name Shop_Integration --on-behalf-of shop-integration.<org-id>@points-shop.dev
```

The user never logs in, so it has no password.

## 2. External Client App (Metadata API format)

`external-client-app/step1` holds the app, its OAuth settings (scope `Api`) and the global OAuth
settings (callback only; Salesforce generates the consumer key and secret). `step2` turns on the
client credentials flow with the integration user as run-as user; it can only be deployed after
step 1. Edit `clientCredentialsFlowUser` and `contactEmail` (your email) before deploying.

```bash
sf project deploy start --metadata-dir org-setup/external-client-app/step1 --wait 10
```

```bash
sf project deploy start --metadata-dir org-setup/external-client-app/step2 --wait 10
```

Then copy the consumer key and secret from Setup → External Client App Manager → Points Shop
Storefront → Settings → OAuth Settings → Consumer Key and Secret into `storefront/.env.local`
(`SF_CLIENT_ID`, `SF_CLIENT_SECRET`).
