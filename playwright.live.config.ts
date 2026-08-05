import { defineConfig, devices } from '@playwright/test';

/**
 * Live suite: runs against the deployed test stack, not a local build and not
 * a mock.
 *
 * Separate from `playwright.config.ts` on purpose. These tests need a human to
 * relay an OTP, spend real (test) money on-chain, and depend on services being
 * up — none of which belongs in a gate that runs on every change. The default
 * config's `testDir` is `./e2e`, which would otherwise pick them up.
 *
 * Chromium only, and not by preference: the WebAuthn virtual authenticator is
 * a CDP API, so no other engine can drive a passkey headlessly.
 */
export default defineConfig({
  testDir: './e2e/live',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.BLOQUE_WALLET_URL ?? 'https://account.dev-bloque.app',
    // Deliberately no `cf-ipcountry` override. It looks like the way to select
    // the Colombian TOS document, and it is not: Cloudflare sets that header
    // itself in front of the real stack and overwrites whatever a client
    // sends, so a spoofed value only ever works against a direct-to-origin
    // call. Compliance resolves the document from the identity's recorded
    // `usage_country_code` regardless — which nothing populates today
    // (BQE-2113), so every identity resolves to the default document. That
    // document now carries `requires_account_activation`, which is what makes
    // the passkey step reachable from a browser at all.
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // No webServer: the point is to exercise what is actually deployed.
});
