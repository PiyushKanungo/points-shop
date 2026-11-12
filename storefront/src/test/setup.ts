// Test environment: stub backend, fixed secrets, Turnstile test keys, local email log.
process.env.SHOP_BACKEND = "stub";
process.env.SITE_URL = "http://localhost:3100";
process.env.SESSION_SECRET = "test-session-secret-0123456789-abcdefghij";
process.env.MAGIC_LINK_SECRET = "test-magic-link-secret-0123456789-abcdefg";
process.env.EMAIL_FROM = "Points Shop <shop@example.com>";
process.env.OWNER_EMAIL = "owner@example.com";
process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
delete process.env.RESEND_API_KEY;
delete process.env.VERCEL_ENV;
delete process.env.STUB_FAIL;
